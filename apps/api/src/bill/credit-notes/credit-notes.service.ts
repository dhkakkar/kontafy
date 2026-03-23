import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeLineItemGst } from '../../common/utils/gst.util';
import { CreateCreditNoteDto, ApplyCreditNoteDto } from '../dto/credit-notes.dto';

@Injectable()
export class CreditNotesService {
  private readonly logger = new Logger(CreditNotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List credit notes with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      status?: string;
      contactId?: string;
      from?: string;
      to?: string;
      search?: string;
    },
  ) {
    const { status, contactId, from, to, search } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      org_id: orgId,
      type: 'credit_note',
    };

    if (status) where.status = status;
    if (contactId) where.contact_id = contactId;

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [creditNotes, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true, company_name: true, gstin: true },
          },
        },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: creditNotes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single credit note with items.
   */
  async findOne(orgId: string, id: string) {
    const creditNote = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId, type: 'credit_note' },
      include: {
        items: true,
        contact: true,
      },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    return creditNote;
  }

  /**
   * Create a credit note (stored as invoice with type='credit_note').
   */
  async create(orgId: string, userId: string, data: CreateCreditNoteDto) {
    // Validate contact
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Validate original invoice if provided
    if (data.original_invoice_id) {
      const originalInvoice = await this.prisma.invoice.findFirst({
        where: { id: data.original_invoice_id, org_id: orgId },
      });
      if (!originalInvoice) {
        throw new NotFoundException('Original invoice not found');
      }
    }

    const isIgst = data.is_igst || false;

    // Generate credit note number
    const invoiceNumber = await this.generateCreditNoteNumber(orgId);

    // Compute totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const computedItems = data.items.map((item) => {
      const gstRate = isIgst
        ? (item.igst_rate || 0)
        : ((item.cgst_rate || 0) + (item.sgst_rate || 0));
      const cessRate = item.cess_rate || 0;

      const computed = computeLineItemGst(
        item.quantity,
        item.rate,
        item.discount_pct || 0,
        gstRate,
        cessRate,
        isIgst,
      );

      subtotal += computed.subtotal;
      totalDiscount += computed.discountAmount;
      totalTax += computed.totalTax;

      return {
        product_id: item.product_id,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        rate: item.rate,
        discount_pct: item.discount_pct || 0,
        taxable_amount: computed.taxableAmount,
        cgst_rate: computed.cgstRate,
        cgst_amount: computed.cgstAmount,
        sgst_rate: computed.sgstRate,
        sgst_amount: computed.sgstAmount,
        igst_rate: computed.igstRate,
        igst_amount: computed.igstAmount,
        cess_rate: computed.cessRate,
        cess_amount: computed.cessAmount,
        total: computed.totalWithTax,
      };
    });

    const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;

    const creditNote = await this.prisma.$transaction(async (tx) => {
      const cn = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: invoiceNumber,
          type: 'credit_note',
          status: 'draft',
          contact_id: data.contact_id,
          date: new Date(data.date),
          place_of_supply: data.place_of_supply,
          is_igst: isIgst,
          subtotal: subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total: grandTotal,
          amount_paid: 0,
          balance_due: grandTotal,
          notes: data.notes || data.reason,
          created_by: userId,
        },
      });

      await tx.invoiceItem.createMany({
        data: computedItems.map((item) => ({
          invoice_id: cn.id,
          ...item,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: cn.id },
        include: { items: true, contact: true },
      });
    });

    return creditNote;
  }

  /**
   * Apply a credit note against an invoice (reduces invoice balance).
   */
  async apply(orgId: string, creditNoteId: string, data: ApplyCreditNoteDto) {
    const creditNote = await this.prisma.invoice.findFirst({
      where: { id: creditNoteId, org_id: orgId, type: 'credit_note' },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status === 'cancelled') {
      throw new BadRequestException('Cannot apply a cancelled credit note');
    }

    const cnBalance = creditNote.balance_due?.toNumber() || 0;
    if (data.amount > cnBalance) {
      throw new BadRequestException(
        `Application amount (${data.amount}) exceeds credit note remaining balance (${cnBalance})`,
      );
    }

    // Validate target invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: data.invoice_id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const invoiceBalance = invoice.balance_due?.toNumber() || 0;
    if (data.amount > invoiceBalance) {
      throw new BadRequestException(
        `Application amount (${data.amount}) exceeds invoice balance due (${invoiceBalance})`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update invoice: reduce balance, increase amount_paid
      const newInvoicePaid = (invoice.amount_paid?.toNumber() || 0) + data.amount;
      const newInvoiceBalance = (invoice.total?.toNumber() || 0) - newInvoicePaid;

      let newInvoiceStatus = invoice.status;
      if (newInvoiceBalance <= 0) {
        newInvoiceStatus = 'paid';
      } else if (newInvoicePaid > 0) {
        newInvoiceStatus = 'partially_paid';
      }

      await tx.invoice.update({
        where: { id: data.invoice_id },
        data: {
          amount_paid: newInvoicePaid,
          balance_due: Math.max(0, newInvoiceBalance),
          status: newInvoiceStatus,
          updated_at: new Date(),
        },
      });

      // Update credit note: reduce balance
      const newCnPaid = (creditNote.amount_paid?.toNumber() || 0) + data.amount;
      const newCnBalance = (creditNote.total?.toNumber() || 0) - newCnPaid;

      let newCnStatus = creditNote.status;
      if (newCnBalance <= 0) {
        newCnStatus = 'paid'; // fully applied
      } else if (newCnPaid > 0) {
        newCnStatus = 'partially_paid';
      }

      await tx.invoice.update({
        where: { id: creditNoteId },
        data: {
          amount_paid: newCnPaid,
          balance_due: Math.max(0, newCnBalance),
          status: newCnStatus,
          updated_at: new Date(),
        },
      });

      return {
        credit_note_id: creditNoteId,
        invoice_id: data.invoice_id,
        amount_applied: data.amount,
        credit_note_remaining: Math.max(0, newCnBalance),
        invoice_remaining: Math.max(0, newInvoiceBalance),
      };
    });

    return result;
  }

  /**
   * Generate credit note number.
   */
  private async generateCreditNoteNumber(orgId: string): Promise<string> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    const fyString = `${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`;

    const fyStartDate = new Date(`${fyStart}-04-01`);
    const fyEndDate = new Date(`${fyEnd}-03-31`);

    const count = await this.prisma.invoice.count({
      where: {
        org_id: orgId,
        type: 'credit_note',
        date: { gte: fyStartDate, lte: fyEndDate },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `CN/${fyString}/${sequence}`;
  }
}
