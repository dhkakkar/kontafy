import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, AllocatePaymentDto } from '../dto/payments.dto';
import { JournalPostingService } from '../../books/journal-posting/journal-posting.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly journalPosting: JournalPostingService,
  ) {}

  /**
   * List payments with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      type?: string;
      contactId?: string;
      from?: string;
      to?: string;
      search?: string;
    },
  ) {
    const { type, contactId, from, to, search } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };

    if (type) where.type = type;
    if (contactId) where.contact_id = contactId;

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true, company_name: true },
          },
          allocations: {
            include: {
              invoice: {
                select: { id: true, invoice_number: true, total: true },
              },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single payment with allocations + the bank account behind
   * it. The detail page uses bank_account.{bank_name, account_name}
   * to render "Bank Account: ICICI Bank — ..." in the read view and
   * to pre-fill the edit modal's picker.
   */
  async findOne(orgId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, org_id: orgId },
      include: {
        contact: true,
        bank_account: {
          select: { id: true, bank_name: true, account_name: true },
        },
        allocations: {
          include: {
            invoice: {
              select: { id: true, invoice_number: true, total: true, balance_due: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Update payment details.
   */
  async update(orgId: string, id: string, data: Record<string, any>) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, org_id: orgId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const allowedFields = ['amount', 'date', 'method', 'reference', 'notes', 'bank_account_id'];
    const cleanData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in data) {
        if (key === 'date') {
          cleanData[key] = new Date(data[key]);
        } else {
          cleanData[key] = data[key];
        }
      }
    }

    return this.prisma.payment.update({
      where: { id },
      data: cleanData,
      include: {
        contact: true,
        allocations: {
          include: {
            invoice: {
              select: { id: true, invoice_number: true, total: true, balance_due: true },
            },
          },
        },
      },
    });
  }

  /**
   * Delete a payment and reverse any invoice allocations.
   */
  async remove(orgId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, org_id: orgId },
      include: { allocations: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Reverse the payment's own journal first (uses the payment row's
    // journal_id, which is gone after the delete below).
    await this.journalPosting
      .reversePayment(id)
      .catch((err) => this.logger.error(`Reverse payment journal failed ${id}`, err));

    const affectedInvoiceIds = payment.allocations.map((a) => a.invoice_id);

    await this.prisma.$transaction(async (tx) => {
      // Reverse allocations on invoices
      for (const alloc of payment.allocations) {
        const invoice = await tx.invoice.findUnique({
          where: { id: alloc.invoice_id },
        });
        if (invoice) {
          const newAmountPaid = Math.max(0, (invoice.amount_paid?.toNumber() || 0) - alloc.amount.toNumber());
          const newBalanceDue = (invoice.total?.toNumber() || 0) - newAmountPaid;
          let newStatus = invoice.status;
          if (newAmountPaid <= 0) {
            newStatus = 'sent';
          } else if (newBalanceDue > 0) {
            newStatus = 'partially_paid';
          }
          await tx.invoice.update({
            where: { id: alloc.invoice_id },
            data: {
              amount_paid: newAmountPaid,
              balance_due: Math.max(0, newBalanceDue),
              status: newStatus,
              pdf_url: null,
              updated_at: new Date(),
            },
          });
        }
      }

      // Delete allocations then payment
      await tx.paymentAllocation.deleteMany({ where: { payment_id: id } });
      await tx.payment.delete({ where: { id } });
    });

    // Re-post each affected invoice's journal so the books reflect the
    // reversed AR/AP balances and updated status.
    for (const invId of affectedInvoiceIds) {
      try {
        await this.journalPosting.postInvoice(invId);
      } catch (err) {
        this.logger.error(`Journal repost failed for invoice ${invId}`, err as any);
      }
    }

    return { deleted: true };
  }

  /**
   * Record a new payment with bill-wise settlement.
   *
   * Allocation rules:
   *  - `allocations` (array) is the primary input — each row settles
   *    a specific invoice/bill by `amount`.
   *  - `invoice_id` (single) is a legacy shortcut: if provided, it
   *    collapses into a 1-row allocations array of the full payment
   *    amount. Kept so older callers (e.g. the standalone payment
   *    modal) and tests keep working.
   *  - Sum of allocation amounts must be ≤ payment amount. The gap
   *    (payment.amount − Σallocations) is the customer/vendor advance
   *    and gets posted to 2116 / 1112 by `postPayment()`.
   *  - Per-row: alloc.amount must be ≤ invoice.balance_due, else the
   *    payment would over-pay that specific bill.
   */
  async create(orgId: string, data: CreatePaymentDto) {
    // Validate contact exists
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Normalise legacy single-invoice form into the allocations array
    // so the downstream code has exactly one shape to deal with.
    const allocations =
      data.allocations && data.allocations.length > 0
        ? data.allocations
        : data.invoice_id
          ? [{ invoice_id: data.invoice_id, amount: data.amount }]
          : [];

    const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
    // Round to 2dp so floating-point noise on e.g. ₹1234.567 doesn't
    // trip the "allocations exceed payment" guard.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const advanceAmount = round2(data.amount - totalAllocated);

    if (round2(totalAllocated) > round2(data.amount)) {
      throw new BadRequestException(
        `Total allocations (${round2(totalAllocated)}) exceed payment amount (${data.amount}).`,
      );
    }

    // Validate every allocated invoice belongs to the org + contact
    // and has enough balance_due to absorb the allocation.
    if (allocations.length > 0) {
      const invoiceIds = allocations.map((a) => a.invoice_id);
      const invoices = await this.prisma.invoice.findMany({
        where: { id: { in: invoiceIds }, org_id: orgId },
        select: {
          id: true,
          invoice_number: true,
          contact_id: true,
          balance_due: true,
          total: true,
          amount_paid: true,
          status: true,
        },
      });
      const byId = new Map(invoices.map((i) => [i.id, i]));
      for (const alloc of allocations) {
        const inv = byId.get(alloc.invoice_id);
        if (!inv) {
          throw new NotFoundException(`Invoice ${alloc.invoice_id} not found`);
        }
        // Strict equality — a contactless invoice (legacy / orphan)
        // shouldn't be allocatable to any contact either, since the
        // resulting JE would imply the wrong A/R sub-ledger.
        if (inv.contact_id !== data.contact_id) {
          throw new BadRequestException(
            `Invoice ${inv.invoice_number} does not belong to the selected contact.`,
          );
        }
        const balance = inv.balance_due?.toNumber() || 0;
        if (round2(alloc.amount) > round2(balance)) {
          throw new BadRequestException(
            `Allocation ${alloc.amount} exceeds balance due ${balance} on invoice ${inv.invoice_number}.`,
          );
        }
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      // Create the payment row first — its ID is needed as the FK on
      // every allocation row.
      const pmt = await tx.payment.create({
        data: {
          org_id: orgId,
          type: data.type,
          contact_id: data.contact_id,
          amount: data.amount,
          date: new Date(data.date),
          method: data.method,
          reference: data.reference,
          bank_account_id: data.bank_account_id ?? null,
          notes: data.notes,
        },
      });

      // Apply each allocation: insert the PaymentAllocation row, then
      // bump the matching invoice's amount_paid / balance_due / status.
      // Doing the invoice update per-row (rather than in a single
      // batched query) lets us compute the new status from the latest
      // balance value without a second read pass.
      for (const alloc of allocations) {
        await tx.paymentAllocation.create({
          data: {
            payment_id: pmt.id,
            invoice_id: alloc.invoice_id,
            amount: alloc.amount,
          },
        });

        const invoice = await tx.invoice.findUnique({
          where: { id: alloc.invoice_id },
        });
        if (!invoice) continue;

        const newAmountPaid = round2(
          (invoice.amount_paid?.toNumber() || 0) + alloc.amount,
        );
        const newBalanceDue = round2(
          (invoice.total?.toNumber() || 0) - newAmountPaid,
        );

        let newStatus = invoice.status;
        if (newBalanceDue <= 0) {
          newStatus = 'paid';
        } else if (newAmountPaid > 0) {
          newStatus = 'partially_paid';
        }

        await tx.invoice.update({
          where: { id: alloc.invoice_id },
          data: {
            amount_paid: newAmountPaid,
            balance_due: Math.max(0, newBalanceDue),
            status: newStatus,
            // Invalidate the cached PDF so the next download regenerates
            // it with the latest amount_paid / balance_due / status.
            pdf_url: null,
            updated_at: new Date(),
          },
        });
      }

      return tx.payment.findUnique({
        where: { id: pmt.id },
        include: {
          contact: true,
          allocations: {
            include: {
              invoice: {
                select: { id: true, invoice_number: true, total: true, balance_due: true },
              },
            },
          },
        },
      });
    });

    // Post the JE outside the transaction. postPayment() reads the
    // allocations + advance gap and emits a 2-or-3-line entry:
    //   receive: Dr Bank | Cr A/R (allocated) | Cr 2116 (advance)
    //   pay:     Dr A/P (allocated) | Dr 1112 (advance) | Cr Bank
    // Best-effort — a missing ledger account leaves the payment row
    // unposted to be backfilled later rather than blocking the
    // user's create.
    if (payment?.id) {
      try {
        await this.journalPosting.postPayment(payment.id);
        // Re-post the affected invoice journals so their balance_due
        // flows through to the cached PDFs and ledger views.
        for (const alloc of payment.allocations || []) {
          if (alloc?.invoice?.id) {
            await this.journalPosting.postInvoice(alloc.invoice.id);
          }
        }
      } catch (err) {
        this.logger.error(`Journal post failed for payment ${payment.id}`, err as any);
      }
    }

    // Surface the computed advance to the caller so the UI can render
    // a confirmation banner ("₹8,700 recorded as advance").
    return { ...payment, advance_amount: advanceAmount } as any;
  }

  /**
   * Allocate a payment to multiple invoices.
   */
  async allocate(orgId: string, paymentId: string, data: AllocatePaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, org_id: orgId },
      include: { allocations: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Calculate already allocated amount
    const alreadyAllocated = payment.allocations.reduce(
      (sum, a) => sum + a.amount.toNumber(),
      0,
    );

    const newAllocationTotal = data.allocations.reduce(
      (sum, a) => sum + a.amount,
      0,
    );

    if (alreadyAllocated + newAllocationTotal > payment.amount.toNumber()) {
      throw new BadRequestException(
        `Total allocations (${alreadyAllocated + newAllocationTotal}) exceed payment amount (${payment.amount.toNumber()})`,
      );
    }

    // Validate each invoice and check balance
    for (const alloc of data.allocations) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: alloc.invoice_id, org_id: orgId },
      });
      if (!invoice) {
        throw new NotFoundException(`Invoice ${alloc.invoice_id} not found`);
      }
      const balanceDue = invoice.balance_due?.toNumber() || 0;
      if (alloc.amount > balanceDue) {
        throw new BadRequestException(
          `Allocation amount (${alloc.amount}) exceeds balance due (${balanceDue}) for invoice ${invoice.invoice_number}`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Create allocations and update invoices
      for (const alloc of data.allocations) {
        await tx.paymentAllocation.create({
          data: {
            payment_id: paymentId,
            invoice_id: alloc.invoice_id,
            amount: alloc.amount,
          },
        });

        const invoice = await tx.invoice.findUnique({
          where: { id: alloc.invoice_id },
        });
        if (invoice) {
          const newAmountPaid = (invoice.amount_paid?.toNumber() || 0) + alloc.amount;
          const newBalanceDue = (invoice.total?.toNumber() || 0) - newAmountPaid;

          let newStatus = invoice.status;
          if (newBalanceDue <= 0) {
            newStatus = 'paid';
          } else if (newAmountPaid > 0) {
            newStatus = 'partially_paid';
          }

          await tx.invoice.update({
            where: { id: alloc.invoice_id },
            data: {
              amount_paid: newAmountPaid,
              balance_due: Math.max(0, newBalanceDue),
              status: newStatus,
              pdf_url: null,
              updated_at: new Date(),
            },
          });
        }
      }

      return tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          contact: true,
          allocations: {
            include: {
              invoice: {
                select: { id: true, invoice_number: true, total: true, balance_due: true },
              },
            },
          },
        },
      });
    });

    return result;
  }

  /**
   * Outstanding invoices/bills for a specific contact — the data
   * source for the Record Payment page's allocation table.
   *
   * `direction`:
   *   - 'receive' → unpaid sales invoices for a customer (or 'both')
   *   - 'pay'     → unpaid purchase bills for a vendor (or 'both')
   *
   * Returns rows sorted by date ascending (FIFO) so the allocation
   * table's "Apply to Oldest" button can fill from index 0 down.
   * Only statuses that can actually receive payment are included
   * (drafts and cancelled bills don't belong in an outstanding list).
   */
  async getOutstandingForContact(
    orgId: string,
    contactId: string,
    direction: 'receive' | 'pay',
  ) {
    const type = direction === 'receive' ? 'sale' : 'purchase';
    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        contact_id: contactId,
        type,
        status: { in: ['sent', 'partially_paid', 'overdue'] },
      },
      orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
      select: {
        id: true,
        invoice_number: true,
        date: true,
        due_date: true,
        total: true,
        amount_paid: true,
        balance_due: true,
        status: true,
      },
    });

    // Frontend expects numbers, not Prisma Decimal instances.
    return {
      data: invoices.map((inv) => ({
        ...inv,
        total: inv.total ? Number(inv.total) : 0,
        amount_paid: inv.amount_paid ? Number(inv.amount_paid) : 0,
        balance_due: inv.balance_due ? Number(inv.balance_due) : 0,
      })),
      meta: {
        contact_id: contactId,
        direction,
        count: invoices.length,
      },
    };
  }

  /**
   * Outstanding receivables/payables summary with aging analysis.
   */
  async getOutstandingSummary(orgId: string) {
    const now = new Date();

    // Get all outstanding invoices
    const outstandingInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        status: { in: ['sent', 'partially_paid', 'overdue'] },
      },
      include: {
        contact: {
          select: { id: true, name: true, company_name: true, type: true },
        },
      },
    });

    let totalReceivable = 0;
    let totalPayable = 0;
    let totalOverdue = 0;

    const agingBuckets = {
      receivable: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 },
      payable: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 },
    };

    // Per-contact aging
    const contactAging: Record<string, {
      contact_id: string;
      contact_name: string;
      type: string;
      total: number;
      current: number;
      days_1_30: number;
      days_31_60: number;
      days_61_90: number;
      days_90_plus: number;
    }> = {};

    for (const inv of outstandingInvoices) {
      const balance = inv.balance_due?.toNumber() || 0;
      if (balance <= 0) continue;

      const isSale = inv.type === 'sale';
      const dueDate = inv.due_date || inv.date;
      const daysPastDue = Math.floor(
        (now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (isSale) {
        totalReceivable += balance;
      } else {
        totalPayable += balance;
      }

      if (daysPastDue > 0) {
        totalOverdue += balance;
      }

      // Determine aging bucket
      const bucket = isSale ? agingBuckets.receivable : agingBuckets.payable;
      if (daysPastDue <= 0) {
        bucket.current += balance;
      } else if (daysPastDue <= 30) {
        bucket.days_1_30 += balance;
      } else if (daysPastDue <= 60) {
        bucket.days_31_60 += balance;
      } else if (daysPastDue <= 90) {
        bucket.days_61_90 += balance;
      } else {
        bucket.days_90_plus += balance;
      }

      // Per-contact aging
      const contactId = inv.contact?.id || 'unknown';
      if (!contactAging[contactId]) {
        contactAging[contactId] = {
          contact_id: contactId,
          contact_name: inv.contact?.name || 'Unknown',
          type: inv.contact?.type || 'customer',
          total: 0,
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          days_90_plus: 0,
        };
      }

      contactAging[contactId].total += balance;
      if (daysPastDue <= 0) {
        contactAging[contactId].current += balance;
      } else if (daysPastDue <= 30) {
        contactAging[contactId].days_1_30 += balance;
      } else if (daysPastDue <= 60) {
        contactAging[contactId].days_31_60 += balance;
      } else if (daysPastDue <= 90) {
        contactAging[contactId].days_61_90 += balance;
      } else {
        contactAging[contactId].days_90_plus += balance;
      }
    }

    // Round all values
    const round = (n: number) => Math.round(n * 100) / 100;

    return {
      summary: {
        total_receivable: round(totalReceivable),
        total_payable: round(totalPayable),
        total_overdue: round(totalOverdue),
        net_outstanding: round(totalReceivable - totalPayable),
      },
      aging: {
        receivable: {
          current: round(agingBuckets.receivable.current),
          days_1_30: round(agingBuckets.receivable.days_1_30),
          days_31_60: round(agingBuckets.receivable.days_31_60),
          days_61_90: round(agingBuckets.receivable.days_61_90),
          days_90_plus: round(agingBuckets.receivable.days_90_plus),
        },
        payable: {
          current: round(agingBuckets.payable.current),
          days_1_30: round(agingBuckets.payable.days_1_30),
          days_31_60: round(agingBuckets.payable.days_31_60),
          days_61_90: round(agingBuckets.payable.days_61_90),
          days_90_plus: round(agingBuckets.payable.days_90_plus),
        },
      },
      contact_aging: Object.values(contactAging)
        .map((c) => ({
          ...c,
          total: round(c.total),
          current: round(c.current),
          days_1_30: round(c.days_1_30),
          days_31_60: round(c.days_31_60),
          days_61_90: round(c.days_61_90),
          days_90_plus: round(c.days_90_plus),
        }))
        .sort((a, b) => b.total - a.total),
    };
  }
}
