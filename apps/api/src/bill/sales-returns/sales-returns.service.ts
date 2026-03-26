import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeLineItemGst } from '../../common/utils/gst.util';
import { CreateSalesReturnDto } from '../dto/sales-returns.dto';

@Injectable()
export class SalesReturnsService {
  private readonly logger = new Logger(SalesReturnsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List sales returns with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      status?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const { status, search, dateFrom, dateTo } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      org_id: orgId,
      type: 'sales_return',
    };

    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [salesReturns, total] = await Promise.all([
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

    // Map to the shape the frontend expects
    const data = salesReturns.map((sr) => ({
      id: sr.id,
      return_number: sr.invoice_number,
      contact_name: sr.contact?.name,
      contact: sr.contact,
      original_invoice_number: null,
      date: sr.date,
      amount: sr.total?.toNumber() || 0,
      status: sr.status,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single sales return with items.
   */
  async findOne(orgId: string, id: string) {
    const salesReturn = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId, type: 'sales_return' },
      include: {
        items: true,
        contact: true,
      },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found');
    }

    return salesReturn;
  }

  /**
   * Create a sales return (stored as invoice with type='sales_return').
   */
  async create(orgId: string, userId: string, data: CreateSalesReturnDto) {
    // Validate contact
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Validate original invoice if provided
    if (data.invoice_id) {
      const originalInvoice = await this.prisma.invoice.findFirst({
        where: { id: data.invoice_id, org_id: orgId },
      });
      if (!originalInvoice) {
        throw new NotFoundException('Original invoice not found');
      }
    }

    // Generate sales return number
    const returnNumber = await this.generateReturnNumber(orgId);

    // Compute totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const computedItems = data.items.map((item) => {
      const gstRate = (item.cgst_rate || 0) + (item.sgst_rate || 0);
      const cessRate = 0;

      const computed = computeLineItemGst(
        item.quantity,
        item.rate,
        item.discount_pct || 0,
        gstRate,
        cessRate,
        false,
      );

      subtotal += computed.subtotal;
      totalDiscount += computed.discountAmount;
      totalTax += computed.totalTax;

      return {
        product_id: item.product_id,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: 'pcs',
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

    const additionalDiscount = data.additional_discount || 0;
    const additionalCharges = data.additional_charges || 0;
    const grandTotal = Math.round(
      (subtotal - totalDiscount + totalTax - additionalDiscount + additionalCharges) * 100,
    ) / 100;

    const salesReturn = await this.prisma.$transaction(async (tx) => {
      const sr = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: returnNumber,
          type: 'sales_return',
          status: data.status || 'draft',
          contact_id: data.contact_id,
          date: new Date(data.date),
          is_igst: false,
          subtotal: subtotal,
          discount_amount: totalDiscount + additionalDiscount,
          tax_amount: totalTax,
          total: grandTotal,
          amount_paid: 0,
          balance_due: grandTotal,
          notes: data.notes || data.reason,
          terms: data.terms,
          created_by: userId,
        },
      });

      await tx.invoiceItem.createMany({
        data: computedItems.map((item) => ({
          invoice_id: sr.id,
          ...item,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: sr.id },
        include: { items: true, contact: true },
      });
    });

    return salesReturn;
  }

  /**
   * Generate sales return number.
   */
  private async generateReturnNumber(orgId: string): Promise<string> {
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
        type: 'sales_return',
        date: { gte: fyStartDate, lte: fyEndDate },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `SR/${fyString}/${sequence}`;
  }
}
