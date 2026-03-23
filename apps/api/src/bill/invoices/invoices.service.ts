import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeLineItemGst, isInterStateSupply } from '../../common/utils/gst.util';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List invoices with filtering, search, and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      status?: string;
      type?: string;
      contactId?: string;
      from?: string;
      to?: string;
      search?: string;
    },
  ) {
    const { status, type, contactId, from, to, search } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };

    if (status) where.status = status;
    if (type) where.type = type;
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

    const [invoices, total] = await Promise.all([
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
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single invoice with all items and contact info.
   */
  async findOne(orgId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
        contact: true,
        payment_allocations: {
          include: {
            payment: {
              select: {
                id: true,
                type: true,
                amount: true,
                date: true,
                method: true,
                reference: true,
                notes: true,
                created_at: true,
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            legal_name: true,
            gstin: true,
            pan: true,
            address: true,
            phone: true,
            email: true,
            logo_url: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Create a new invoice with computed GST.
   */
  async create(
    orgId: string,
    userId: string,
    data: {
      type: string;
      contact_id: string;
      date: string;
      due_date?: string;
      place_of_supply?: string;
      is_igst?: boolean;
      notes?: string;
      terms?: string;
      items: Array<{
        product_id?: string;
        description: string;
        hsn_code?: string;
        quantity: number;
        unit?: string;
        rate: number;
        discount_pct?: number;
        cgst_rate?: number;
        sgst_rate?: number;
        igst_rate?: number;
        cess_rate?: number;
      }>;
    },
  ) {
    // Validate type
    const validTypes = ['sale', 'purchase', 'credit_note', 'debit_note'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(`Invalid invoice type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate contact exists
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Invoice must have at least one item');
    }

    // Determine inter-state supply
    const isIgst = data.is_igst || false;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(orgId, data.type);

    // Compute totals for each item
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

    // Create invoice with items in a transaction
    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: invoiceNumber,
          type: data.type,
          status: 'draft',
          contact_id: data.contact_id,
          date: new Date(data.date),
          due_date: data.due_date ? new Date(data.due_date) : null,
          place_of_supply: data.place_of_supply,
          is_igst: isIgst,
          subtotal: subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total: grandTotal,
          amount_paid: 0,
          balance_due: grandTotal,
          notes: data.notes,
          terms: data.terms,
          created_by: userId,
        },
      });

      await tx.invoiceItem.createMany({
        data: computedItems.map((item) => ({
          invoice_id: inv.id,
          ...item,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: inv.id },
        include: { items: true, contact: true },
      });
    });

    return invoice;
  }

  /**
   * Update a draft invoice.
   */
  async update(orgId: string, id: string, data: Record<string, any>) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be updated');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
      include: { items: true, contact: true },
    });
  }

  /**
   * Update invoice status.
   */
  async updateStatus(orgId: string, id: string, status: string) {
    const validStatuses = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Validate status transitions
    const allowedTransitions: Record<string, string[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['partially_paid', 'paid', 'overdue', 'cancelled'],
      partially_paid: ['paid', 'overdue', 'cancelled'],
      overdue: ['partially_paid', 'paid', 'cancelled'],
      paid: [],
      cancelled: [],
    };

    const allowed = allowedTransitions[invoice.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from "${invoice.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
  }

  /**
   * Delete a draft invoice.
   */
  async remove(orgId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoice_id: id } });
      await tx.invoice.delete({ where: { id } });
    });

    return { message: 'Invoice deleted successfully' };
  }

  /**
   * Get or generate PDF URL for an invoice.
   */
  async getPdfUrl(orgId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.pdf_url) {
      return { url: invoice.pdf_url };
    }

    // TODO: Queue PDF generation job via BullMQ
    return {
      message: 'PDF generation queued',
      status: 'pending',
    };
  }

  /**
   * Duplicate an invoice as a new draft.
   */
  async duplicate(orgId: string, id: string, userId: string) {
    const original = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId },
      include: { items: true },
    });

    if (!original) {
      throw new NotFoundException('Invoice not found');
    }

    const invoiceNumber = await this.generateInvoiceNumber(orgId, original.type);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: invoiceNumber,
          type: original.type,
          status: 'draft',
          contact_id: original.contact_id,
          date: new Date(),
          due_date: original.due_date ? new Date(Date.now() + (new Date(original.due_date).getTime() - new Date(original.date).getTime())) : null,
          place_of_supply: original.place_of_supply,
          is_igst: original.is_igst,
          subtotal: original.subtotal,
          discount_amount: original.discount_amount,
          tax_amount: original.tax_amount,
          total: original.total,
          amount_paid: 0,
          balance_due: original.total,
          notes: original.notes,
          terms: original.terms,
          created_by: userId,
        },
      });

      if (original.items.length > 0) {
        await tx.invoiceItem.createMany({
          data: original.items.map((item) => ({
            invoice_id: inv.id,
            product_id: item.product_id,
            description: item.description,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            discount_pct: item.discount_pct,
            taxable_amount: item.taxable_amount,
            cgst_rate: item.cgst_rate,
            cgst_amount: item.cgst_amount,
            sgst_rate: item.sgst_rate,
            sgst_amount: item.sgst_amount,
            igst_rate: item.igst_rate,
            igst_amount: item.igst_amount,
            cess_rate: item.cess_rate,
            cess_amount: item.cess_amount,
            total: item.total,
          })),
        });
      }

      return tx.invoice.findUnique({
        where: { id: inv.id },
        include: { items: true, contact: true },
      });
    });

    return invoice;
  }

  /**
   * Auto-generate invoice number based on org settings and fiscal year.
   * Format: KTF/25-26/0001
   */
  private async generateInvoiceNumber(orgId: string, type: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const prefix = (type === 'sale' ? 'INV' : type === 'purchase' ? 'BILL' : type === 'credit_note' ? 'CN' : 'DN');

    // Determine current fiscal year
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    const fyString = `${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`;

    // Count existing invoices of this type in this FY
    const fyStartDate = new Date(`${fyStart}-04-01`);
    const fyEndDate = new Date(`${fyEnd}-03-31`);

    const count = await this.prisma.invoice.count({
      where: {
        org_id: orgId,
        type,
        date: { gte: fyStartDate, lte: fyEndDate },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');

    return `${prefix}/${fyString}/${sequence}`;
  }
}
