import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryChallanDto } from '../dto/delivery-challans.dto';

@Injectable()
export class DeliveryChallansService {
  private readonly logger = new Logger(DeliveryChallansService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      type: 'delivery_challan',
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

    const [challans, total] = await Promise.all([
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

    const data = challans.map((c) => ({
      id: c.id,
      challan_number: c.invoice_number,
      invoice_number: c.invoice_number,
      contact_name: c.contact?.name,
      contact: c.contact,
      date: c.date,
      status: c.status,
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

  async findOne(orgId: string, id: string) {
    const challan = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId, type: 'delivery_challan' },
      include: {
        items: true,
        contact: true,
      },
    });

    if (!challan) {
      throw new NotFoundException('Delivery challan not found');
    }

    return challan;
  }

  async create(orgId: string, userId: string, data: CreateDeliveryChallanDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const challanNumber = await this.generateChallanNumber(orgId);

    const challan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          org_id: orgId,
          invoice_number: challanNumber,
          type: 'delivery_challan',
          status: data.status || 'draft',
          contact_id: data.contact_id,
          date: new Date(data.date),
          place_of_supply: data.place_of_supply,
          is_igst: false,
          subtotal: 0,
          discount_amount: 0,
          tax_amount: 0,
          total: 0,
          amount_paid: 0,
          balance_due: 0,
          notes: data.notes,
          terms: data.terms,
          created_by: userId,
        },
      });

      await tx.invoiceItem.createMany({
        data: data.items.map((item) => ({
          invoice_id: created.id,
          product_id: item.product_id,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          rate: item.rate || 0,
          discount_pct: 0,
          taxable_amount: 0,
          cgst_rate: 0,
          cgst_amount: 0,
          sgst_rate: 0,
          sgst_amount: 0,
          igst_rate: 0,
          igst_amount: 0,
          cess_rate: 0,
          cess_amount: 0,
          total: (item.rate || 0) * item.quantity,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: created.id },
        include: { items: true, contact: true },
      });
    });

    return challan;
  }

  async updateStatus(orgId: string, id: string, status: string) {
    const challan = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId, type: 'delivery_challan' },
    });

    if (!challan) {
      throw new NotFoundException('Delivery challan not found');
    }

    const allowedStatuses = ['draft', 'sent', 'delivered', 'invoiced', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      throw new NotFoundException(`Invalid status: ${status}`);
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
  }

  async update(orgId: string, id: string, body: Record<string, any>) {
    const existing = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId, type: 'delivery_challan' },
    });

    if (!existing) {
      throw new NotFoundException('Delivery challan not found');
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException(
        'Only draft delivery challans can be edited',
      );
    }

    const {
      type: _type,
      org_id: _orgId,
      id: _id,
      invoice_number: _invoiceNumber,
      challan_number: _challanNumber,
      items,
      ...scalar
    } = body || {};

    if (items !== undefined && Array.isArray(items) && items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let subtotal = existing.subtotal?.toNumber() || 0;
      let totalAmount = existing.total?.toNumber() || 0;

      if (Array.isArray(items)) {
        // Mirror create's math exactly: no GST computation, total = rate * qty
        const mappedItems = items.map((item: any) => ({
          product_id: item.product_id,
          description: item.description,
          hsn_code: item.hsn_code,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          rate: item.rate || 0,
          discount_pct: 0,
          taxable_amount: 0,
          cgst_rate: 0,
          cgst_amount: 0,
          sgst_rate: 0,
          sgst_amount: 0,
          igst_rate: 0,
          igst_amount: 0,
          cess_rate: 0,
          cess_amount: 0,
          total: (item.rate || 0) * item.quantity,
        }));

        subtotal = mappedItems.reduce((sum, it) => sum + it.total, 0);
        totalAmount = subtotal;

        await tx.invoiceItem.deleteMany({ where: { invoice_id: id } });

        await tx.invoiceItem.createMany({
          data: mappedItems.map((item) => ({
            invoice_id: id,
            ...item,
          })),
        });
      }

      const updateData: any = {
        updated_at: new Date(),
      };

      if (scalar.contact_id !== undefined) updateData.contact_id = scalar.contact_id;
      if (scalar.date !== undefined) updateData.date = new Date(scalar.date);
      if (scalar.place_of_supply !== undefined)
        updateData.place_of_supply = scalar.place_of_supply;
      if (scalar.notes !== undefined) updateData.notes = scalar.notes;
      if (scalar.terms !== undefined) updateData.terms = scalar.terms;

      if (Array.isArray(items)) {
        updateData.subtotal = subtotal;
        updateData.total = totalAmount;
      }

      await tx.invoice.update({
        where: { id },
        data: updateData,
      });

      return tx.invoice.findUnique({
        where: { id },
        include: { items: true, contact: true },
      });
    });

    return updated;
  }

  private async generateChallanNumber(orgId: string): Promise<string> {
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
        type: 'delivery_challan',
        date: { gte: fyStartDate, lte: fyEndDate },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `DC/${fyString}/${sequence}`;
  }
}
