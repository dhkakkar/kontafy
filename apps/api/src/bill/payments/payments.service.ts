import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, AllocatePaymentDto } from '../dto/payments.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    const { page, limit, type, contactId, from, to, search } = filters;
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
   * Get a single payment with allocations.
   */
  async findOne(orgId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, org_id: orgId },
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

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Record a new payment and optionally allocate to a single invoice.
   */
  async create(orgId: string, data: CreatePaymentDto) {
    // Validate contact exists
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // If an invoice_id is provided, validate it
    if (data.invoice_id) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: data.invoice_id, org_id: orgId },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      const balanceDue = invoice.balance_due?.toNumber() || 0;
      if (data.amount > balanceDue) {
        throw new BadRequestException(
          `Payment amount (${data.amount}) exceeds invoice balance due (${balanceDue})`,
        );
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      // Create the payment
      const pmt = await tx.payment.create({
        data: {
          org_id: orgId,
          type: data.type,
          contact_id: data.contact_id,
          amount: data.amount,
          date: new Date(data.date),
          method: data.method,
          reference: data.reference,
          bank_account_id: data.bank_account_id,
          notes: data.notes,
        },
      });

      // If invoice_id provided, auto-allocate and update invoice
      if (data.invoice_id) {
        await tx.paymentAllocation.create({
          data: {
            payment_id: pmt.id,
            invoice_id: data.invoice_id,
            amount: data.amount,
          },
        });

        // Update invoice paid amounts
        const invoice = await tx.invoice.findUnique({
          where: { id: data.invoice_id },
        });
        if (invoice) {
          const newAmountPaid = (invoice.amount_paid?.toNumber() || 0) + data.amount;
          const newBalanceDue = (invoice.total?.toNumber() || 0) - newAmountPaid;

          let newStatus = invoice.status;
          if (newBalanceDue <= 0) {
            newStatus = 'paid';
          } else if (newAmountPaid > 0) {
            newStatus = 'partially_paid';
          }

          await tx.invoice.update({
            where: { id: data.invoice_id },
            data: {
              amount_paid: newAmountPaid,
              balance_due: Math.max(0, newBalanceDue),
              status: newStatus,
              updated_at: new Date(),
            },
          });
        }
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

    return payment;
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
