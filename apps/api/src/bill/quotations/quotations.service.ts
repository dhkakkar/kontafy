import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeLineItemGst } from '../../common/utils/gst.util';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new quotation.
   */
  async create(
    orgId: string,
    userId: string,
    data: {
      contact_id: string;
      date: string;
      validity_date?: string;
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
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const isIgst = data.is_igst || false;
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
    const quotationNumber = await this.generateNumber(orgId);

    const quotation = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          org_id: orgId,
          quotation_number: quotationNumber,
          contact_id: data.contact_id,
          status: 'draft',
          date: new Date(data.date),
          validity_date: data.validity_date ? new Date(data.validity_date) : null,
          place_of_supply: data.place_of_supply,
          is_igst: isIgst,
          subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total: grandTotal,
          notes: data.notes,
          terms: data.terms,
          created_by: userId,
        },
      });

      await tx.quotationItem.createMany({
        data: computedItems.map((item) => ({
          quotation_id: q.id,
          ...item,
        })),
      });

      return tx.quotation.findUnique({
        where: { id: q.id },
        include: {
          items: true,
          contact: { select: { id: true, name: true, company_name: true, gstin: true } },
        },
      });
    });

    return quotation;
  }

  /**
   * List quotations with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      status?: string;
      search?: string;
    },
  ) {
    const { status, search } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { quotation_number: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [quotations, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, company_name: true } },
        },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data: quotations,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single quotation with items.
   */
  async findOne(orgId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, org_id: orgId },
      include: {
        items: { orderBy: { id: 'asc' } },
        contact: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return quotation;
  }

  /**
   * Update a quotation (draft/sent only).
   */
  async update(orgId: string, id: string, data: Record<string, any>) {
    const quotation = await this.findOne(orgId, id);

    if (!['draft', 'sent'].includes(quotation.status)) {
      throw new BadRequestException('Only draft or sent quotations can be updated');
    }

    const { org_id, created_by, created_at, items, ...updateData } = data;
    updateData.updated_at = new Date();

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        contact: true,
      },
    });
  }

  /**
   * Update quotation status.
   */
  async updateStatus(orgId: string, id: string, status: string) {
    await this.findOne(orgId, id);

    const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
  }

  /**
   * Convert a quotation to an invoice.
   */
  async convertToInvoice(orgId: string, id: string, userId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, org_id: orgId },
      include: { items: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    if (quotation.status === 'rejected' || quotation.status === 'expired') {
      throw new BadRequestException('Cannot convert a rejected or expired quotation');
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(orgId);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: invoiceNumber,
          type: 'sale',
          status: 'draft',
          contact_id: quotation.contact_id,
          date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          place_of_supply: quotation.place_of_supply,
          is_igst: quotation.is_igst,
          subtotal: quotation.subtotal,
          discount_amount: quotation.discount_amount,
          tax_amount: quotation.tax_amount,
          total: quotation.total,
          amount_paid: 0,
          balance_due: quotation.total,
          notes: quotation.notes,
          terms: quotation.terms,
          created_by: userId,
        },
      });

      if (quotation.items.length > 0) {
        await tx.invoiceItem.createMany({
          data: quotation.items.map((item: any) => ({
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

      // Mark quotation as accepted
      await tx.quotation.update({
        where: { id },
        data: { status: 'accepted', updated_at: new Date() },
      });

      return inv;
    });

    return invoice;
  }

  /**
   * Delete a quotation (any status).
   */
  async remove(orgId: string, id: string) {
    const quotation = await this.findOne(orgId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotation_id: id } });
      await tx.quotation.delete({ where: { id } });
    });

    this.logger.log(`Quotation deleted: ${quotation.quotation_number} (status: ${quotation.status})`);
    return { message: 'Quotation deleted successfully' };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async generateNumber(orgId: string): Promise<string> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    const fyString = `${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`;

    const count = await this.prisma.quotation.count({
      where: { org_id: orgId },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `QT/${fyString}/${sequence}`;
  }

  private async generateInvoiceNumber(orgId: string): Promise<string> {
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
        type: 'sale',
        date: { gte: fyStartDate, lte: fyEndDate },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV/${fyString}/${sequence}`;
  }
}
