import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeLineItemGst } from '../../common/utils/gst.util';
import { CreateRecurringInvoiceDto, UpdateRecurringInvoiceDto } from './dto/recurring.dto';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a recurring invoice template.
   */
  async create(orgId: string, userId: string, data: CreateRecurringInvoiceDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contact_id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const isIgst = data.is_igst || false;

    // Compute line totals
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

    const nextIssueDate = data.next_issue_date
      ? new Date(data.next_issue_date)
      : new Date(data.start_date);

    const recurring = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.recurringInvoice.create({
        data: {
          org_id: orgId,
          name: data.name,
          contact_id: data.contact_id,
          frequency: data.frequency,
          start_date: new Date(data.start_date),
          end_date: data.end_date ? new Date(data.end_date) : null,
          next_issue_date: nextIssueDate,
          payment_terms_days: data.payment_terms_days || 30,
          auto_send: data.auto_send || false,
          place_of_supply: data.place_of_supply,
          is_igst: isIgst,
          subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total: grandTotal,
          notes: data.notes,
          terms: data.terms,
          status: 'active',
          created_by: userId,
        },
      });

      await tx.recurringInvoiceItem.createMany({
        data: computedItems.map((item) => ({
          recurring_invoice_id: rec.id,
          ...item,
        })),
      });

      return tx.recurringInvoice.findUnique({
        where: { id: rec.id },
        include: {
          items: true,
          contact: { select: { id: true, name: true, company_name: true } },
        },
      });
    });

    return recurring;
  }

  /**
   * List recurring invoices with pagination.
   */
  async findAll(
    orgId: string,
    filters: { page: number; limit: number; status?: string },
  ) {
    const { status } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.recurringInvoice.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, company_name: true } },
        },
        orderBy: [{ next_issue_date: 'asc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.recurringInvoice.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single recurring invoice with items.
   */
  async findOne(orgId: string, id: string) {
    const recurring = await this.prisma.recurringInvoice.findFirst({
      where: { id, org_id: orgId },
      include: {
        items: true,
        contact: true,
      },
    });

    if (!recurring) {
      throw new NotFoundException('Recurring invoice not found');
    }

    return recurring;
  }

  /**
   * Get history of invoices generated from this recurring template.
   */
  async getHistory(
    orgId: string,
    id: string,
    filters: { page: number; limit: number },
  ) {
    await this.findOne(orgId, id);

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      org_id: orgId,
      reference_type: 'recurring',
      reference_id: id,
    };

    // Use the journal_entry's reference tracking or a dedicated field
    // For now, we track via e_invoice_ack field as recurring_id reference
    const invoiceWhere: any = {
      org_id: orgId,
      e_invoice_ack: `recurring:${id}`,
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          contact: { select: { id: true, name: true, company_name: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where: invoiceWhere }),
    ]);

    return {
      data: invoices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update a recurring invoice template.
   */
  async update(orgId: string, id: string, data: UpdateRecurringInvoiceDto) {
    const recurring = await this.findOne(orgId, id);

    if (recurring.status === 'stopped') {
      throw new BadRequestException('Cannot update a stopped recurring invoice');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contact_id !== undefined) updateData.contact_id = data.contact_id;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.end_date !== undefined) updateData.end_date = data.end_date ? new Date(data.end_date) : null;
    if (data.payment_terms_days !== undefined) updateData.payment_terms_days = data.payment_terms_days;
    if (data.auto_send !== undefined) updateData.auto_send = data.auto_send;
    if (data.place_of_supply !== undefined) updateData.place_of_supply = data.place_of_supply;
    if (data.is_igst !== undefined) updateData.is_igst = data.is_igst;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    updateData.updated_at = new Date();

    if (data.items && data.items.length > 0) {
      const isIgst = data.is_igst ?? recurring.is_igst;
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
      updateData.subtotal = subtotal;
      updateData.discount_amount = totalDiscount;
      updateData.tax_amount = totalTax;
      updateData.total = grandTotal;

      return this.prisma.$transaction(async (tx) => {
        await tx.recurringInvoiceItem.deleteMany({
          where: { recurring_invoice_id: id },
        });

        await tx.recurringInvoice.update({
          where: { id },
          data: updateData,
        });

        await tx.recurringInvoiceItem.createMany({
          data: computedItems.map((item) => ({
            recurring_invoice_id: id,
            ...item,
          })),
        });

        return tx.recurringInvoice.findUnique({
          where: { id },
          include: { items: true, contact: true },
        });
      });
    }

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: updateData,
      include: { items: true, contact: true },
    });
  }

  /**
   * Pause a recurring invoice.
   */
  async pause(orgId: string, id: string) {
    const recurring = await this.findOne(orgId, id);
    if (recurring.status !== 'active') {
      throw new BadRequestException('Only active recurring invoices can be paused');
    }

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: { status: 'paused', updated_at: new Date() },
    });
  }

  /**
   * Resume a paused recurring invoice.
   */
  async resume(orgId: string, id: string) {
    const recurring = await this.findOne(orgId, id);
    if (recurring.status !== 'paused') {
      throw new BadRequestException('Only paused recurring invoices can be resumed');
    }

    // Recalculate next issue date if it has passed
    let nextDate = new Date(recurring.next_issue_date);
    const now = new Date();
    while (nextDate < now) {
      nextDate = this.computeNextDate(nextDate, recurring.frequency);
    }

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: {
        status: 'active',
        next_issue_date: nextDate,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Delete a recurring invoice template.
   */
  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.recurringInvoiceItem.deleteMany({
        where: { recurring_invoice_id: id },
      });
      await tx.recurringInvoice.delete({ where: { id } });
    });

    return { message: 'Recurring invoice deleted successfully' };
  }

  /**
   * Called by the BullMQ processor daily.
   * Generates invoices for all active recurring invoices due today or earlier.
   */
  async processDueRecurringInvoices(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueRecurring = await this.prisma.recurringInvoice.findMany({
      where: {
        status: 'active',
        next_issue_date: { lte: today },
        OR: [
          { end_date: null },
          { end_date: { gte: today } },
        ],
      },
      include: {
        items: true,
      },
    });

    let generatedCount = 0;

    for (const recurring of dueRecurring) {
      try {
        await this.generateInvoiceFromRecurring(recurring);
        generatedCount++;

        // Advance next_issue_date
        const nextDate = this.computeNextDate(
          new Date(recurring.next_issue_date),
          recurring.frequency,
        );

        // Check if past end_date -> stop
        if (recurring.end_date && nextDate > new Date(recurring.end_date)) {
          await this.prisma.recurringInvoice.update({
            where: { id: recurring.id },
            data: {
              status: 'stopped',
              next_issue_date: nextDate,
              last_generated_at: today,
              generation_count: { increment: 1 },
              updated_at: new Date(),
            },
          });
        } else {
          await this.prisma.recurringInvoice.update({
            where: { id: recurring.id },
            data: {
              next_issue_date: nextDate,
              last_generated_at: today,
              generation_count: { increment: 1 },
              updated_at: new Date(),
            },
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to generate invoice for recurring ${recurring.id}: ${error}`,
        );
      }
    }

    this.logger.log(`Generated ${generatedCount} recurring invoices`);
    return generatedCount;
  }

  /**
   * Generate a single invoice from a recurring template.
   */
  private async generateInvoiceFromRecurring(recurring: any) {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + (recurring.payment_terms_days || 30));

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(
      recurring.org_id,
      'sale',
    );

    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          org_id: recurring.org_id,
          invoice_number: invoiceNumber,
          type: 'sale',
          status: recurring.auto_send ? 'sent' : 'draft',
          contact_id: recurring.contact_id,
          date: today,
          due_date: dueDate,
          place_of_supply: recurring.place_of_supply,
          is_igst: recurring.is_igst,
          subtotal: recurring.subtotal,
          discount_amount: recurring.discount_amount,
          tax_amount: recurring.tax_amount,
          total: recurring.total,
          amount_paid: 0,
          balance_due: recurring.total,
          notes: recurring.notes,
          terms: recurring.terms,
          e_invoice_ack: `recurring:${recurring.id}`,
          created_by: recurring.created_by,
        },
      });

      if (recurring.items && recurring.items.length > 0) {
        await tx.invoiceItem.createMany({
          data: recurring.items.map((item: any) => ({
            invoice_id: invoice.id,
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

      return invoice;
    });
  }

  /**
   * Compute next issue date based on frequency.
   */
  computeNextDate(current: Date, frequency: string): Date {
    const next = new Date(current);
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  /**
   * Generate invoice number (duplicated from InvoicesService for encapsulation).
   */
  private async generateInvoiceNumber(orgId: string, type: string): Promise<string> {
    const prefix = type === 'sale' ? 'INV' : type === 'purchase' ? 'BILL' : type === 'credit_note' ? 'CN' : 'DN';
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
        type,
        date: { gte: fyStartDate, lte: fyEndDate },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}/${fyString}/${sequence}`;
  }
}
