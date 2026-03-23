import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeLineItemGst } from '../../common/utils/gst.util';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new purchase order.
   */
  async create(
    orgId: string,
    userId: string,
    data: {
      contact_id: string;
      date: string;
      delivery_date?: string;
      shipping_address?: Record<string, any>;
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
      throw new NotFoundException('Vendor not found');
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
    const poNumber = await this.generateNumber(orgId);

    const po = await this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          org_id: orgId,
          po_number: poNumber,
          contact_id: data.contact_id,
          status: 'draft',
          date: new Date(data.date),
          delivery_date: data.delivery_date ? new Date(data.delivery_date) : null,
          shipping_address: data.shipping_address || {},
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

      await tx.purchaseOrderItem.createMany({
        data: computedItems.map((item) => ({
          purchase_order_id: order.id,
          ...item,
        })),
      });

      return tx.purchaseOrder.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          contact: { select: { id: true, name: true, company_name: true, gstin: true } },
        },
      });
    });

    return po;
  }

  /**
   * List purchase orders with filtering and pagination.
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
        { po_number: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, company_name: true } },
        },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single purchase order with items.
   */
  async findOne(orgId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, org_id: orgId },
      include: {
        items: { orderBy: { id: 'asc' } },
        contact: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  /**
   * Update a purchase order.
   */
  async update(orgId: string, id: string, data: Record<string, any>) {
    const po = await this.findOne(orgId, id);

    if (!['draft', 'sent'].includes(po.status)) {
      throw new BadRequestException('Only draft or sent purchase orders can be updated');
    }

    const { org_id, created_by, created_at, items, ...updateData } = data;
    updateData.updated_at = new Date();

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        contact: true,
      },
    });
  }

  /**
   * Update purchase order status.
   */
  async updateStatus(orgId: string, id: string, status: string) {
    await this.findOne(orgId, id);

    const validStatuses = ['draft', 'sent', 'acknowledged', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
  }

  /**
   * Convert a purchase order to a purchase bill.
   */
  async convertToBill(orgId: string, id: string, userId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, org_id: orgId },
      include: { items: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status === 'cancelled') {
      throw new BadRequestException('Cannot convert a cancelled purchase order');
    }

    const billNumber = await this.generateBillNumber(orgId);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const bill = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: billNumber,
          type: 'purchase',
          status: 'draft',
          contact_id: po.contact_id,
          date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          place_of_supply: po.place_of_supply,
          is_igst: po.is_igst,
          subtotal: po.subtotal,
          discount_amount: po.discount_amount,
          tax_amount: po.tax_amount,
          total: po.total,
          amount_paid: 0,
          balance_due: po.total,
          notes: po.notes,
          terms: po.terms,
          created_by: userId,
        },
      });

      if (po.items.length > 0) {
        await tx.invoiceItem.createMany({
          data: po.items.map((item: any) => ({
            invoice_id: bill.id,
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

      // Mark PO as received
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'received', updated_at: new Date() },
      });

      return bill;
    });

    return invoice;
  }

  /**
   * Delete a draft purchase order.
   */
  async remove(orgId: string, id: string) {
    const po = await this.findOne(orgId, id);

    if (po.status !== 'draft') {
      throw new BadRequestException('Only draft purchase orders can be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchase_order_id: id } });
      await tx.purchaseOrder.delete({ where: { id } });
    });

    return { message: 'Purchase order deleted successfully' };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async generateNumber(orgId: string): Promise<string> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    const fyString = `${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`;

    const count = await this.prisma.purchaseOrder.count({
      where: { org_id: orgId },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `PO/${fyString}/${sequence}`;
  }

  private async generateBillNumber(orgId: string): Promise<string> {
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
