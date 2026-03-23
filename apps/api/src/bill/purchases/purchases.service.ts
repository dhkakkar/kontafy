import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeLineItemGst } from '../../common/utils/gst.util';
import { CreatePurchaseDto, UpdatePurchaseDto } from '../dto/purchases.dto';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List purchase invoices with filtering and pagination.
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
      type: 'purchase',
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

    const [purchases, total] = await Promise.all([
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
      data: purchases,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single purchase invoice with items.
   */
  async findOne(orgId: string, id: string) {
    const purchase = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId, type: 'purchase' },
      include: {
        items: true,
        contact: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase invoice not found');
    }

    return purchase;
  }

  /**
   * Create a purchase invoice.
   */
  async create(orgId: string, userId: string, data: CreatePurchaseDto) {
    // Validate contact (should be vendor or both)
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Purchase invoice must have at least one item');
    }

    const isIgst = data.is_igst || false;

    // Generate purchase invoice number
    const invoiceNumber = await this.generatePurchaseNumber(orgId);

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

    const purchase = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: invoiceNumber,
          type: 'purchase',
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

    return purchase;
  }

  /**
   * Update a draft purchase invoice.
   */
  async update(orgId: string, id: string, data: UpdatePurchaseDto) {
    const purchase = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId, type: 'purchase' },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase invoice not found');
    }

    if (purchase.status !== 'draft') {
      throw new BadRequestException('Only draft purchase invoices can be updated');
    }

    // If items are provided, recalculate
    if (data.items && data.items.length > 0) {
      const isIgst = data.is_igst ?? purchase.is_igst;

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

      return this.prisma.$transaction(async (tx) => {
        // Delete old items
        await tx.invoiceItem.deleteMany({ where: { invoice_id: id } });

        // Update invoice
        await tx.invoice.update({
          where: { id },
          data: {
            contact_id: data.contact_id,
            date: data.date ? new Date(data.date) : undefined,
            due_date: data.due_date ? new Date(data.due_date) : undefined,
            place_of_supply: data.place_of_supply,
            is_igst: data.is_igst,
            subtotal,
            discount_amount: totalDiscount,
            tax_amount: totalTax,
            total: grandTotal,
            balance_due: grandTotal,
            notes: data.notes,
            terms: data.terms,
            updated_at: new Date(),
          },
        });

        // Create new items
        await tx.invoiceItem.createMany({
          data: computedItems.map((item) => ({
            invoice_id: id,
            ...item,
          })),
        });

        return tx.invoice.findUnique({
          where: { id },
          include: { items: true, contact: true },
        });
      });
    }

    // Simple field update (no items)
    const updateData: any = {};
    if (data.contact_id) updateData.contact_id = data.contact_id;
    if (data.date) updateData.date = new Date(data.date);
    if (data.due_date) updateData.due_date = new Date(data.due_date);
    if (data.place_of_supply !== undefined) updateData.place_of_supply = data.place_of_supply;
    if (data.is_igst !== undefined) updateData.is_igst = data.is_igst;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.vendor_invoice_number !== undefined) updateData.e_invoice_irn = data.vendor_invoice_number;
    updateData.updated_at = new Date();

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { items: true, contact: true },
    });
  }

  /**
   * Generate purchase invoice number.
   */
  private async generatePurchaseNumber(orgId: string): Promise<string> {
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
        type: 'purchase',
        date: { gte: fyStartDate, lte: fyEndDate },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `BILL/${fyString}/${sequence}`;
  }
}
