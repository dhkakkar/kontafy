import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { validateGstin } from '../../common/utils/gst.util';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List contacts with filtering, search, and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      type?: string;
      search?: string;
      activeOnly?: boolean;
    },
  ) {
    const { type, search, activeOnly } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };

    if (type) {
      // Contacts marked as "both" should appear in both customer and vendor tabs
      if (type === 'customer' || type === 'vendor') {
        where.type = { in: [type, 'both'] };
      } else {
        where.type = type;
      }
    }
    if (activeOnly) where.is_active = true;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company_name: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single contact with outstanding balance summary.
   */
  async findOne(orgId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, org_id: orgId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  /**
   * Create a new contact.
   */
  async create(
    orgId: string,
    data: {
      type: string;
      name: string;
      company_name?: string;
      gstin?: string;
      pan?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      billing_address?: Record<string, any>;
      shipping_address?: Record<string, any>;
      payment_terms?: number;
      credit_limit?: number;
      opening_balance?: number;
      notes?: string;
    },
  ) {
    // Validate type
    const validTypes = ['customer', 'vendor', 'both'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(
        `Invalid contact type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    // Validate GSTIN if provided
    if (data.gstin) {
      const gstinResult = validateGstin(data.gstin);
      if (!gstinResult.valid) {
        throw new BadRequestException(`Invalid GSTIN: ${gstinResult.error}`);
      }

      // Check for duplicate GSTIN within the same org
      const existingGstin = await this.prisma.contact.findFirst({
        where: { org_id: orgId, gstin: data.gstin },
      });
      if (existingGstin) {
        throw new BadRequestException(
          `A contact with GSTIN ${data.gstin} already exists: ${existingGstin.name}`,
        );
      }
    }

    // Check for duplicate phone within the same org
    if (data.phone) {
      const existingPhone = await this.prisma.contact.findFirst({
        where: { org_id: orgId, phone: data.phone },
      });
      if (existingPhone) {
        throw new BadRequestException(
          `A contact with phone ${data.phone} already exists: ${existingPhone.name}`,
        );
      }
    }

    // Validate PAN format if provided
    if (data.pan) {
      const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panPattern.test(data.pan)) {
        throw new BadRequestException('Invalid PAN format. Expected: ABCDE1234F');
      }
    }

    const contact = await this.prisma.contact.create({
      data: {
        org_id: orgId,
        type: data.type,
        name: data.name,
        company_name: data.company_name,
        gstin: data.gstin,
        pan: data.pan,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        billing_address: data.billing_address || {},
        shipping_address: data.shipping_address || {},
        payment_terms: data.payment_terms || 30,
        credit_limit: data.credit_limit,
        opening_balance: data.opening_balance || 0,
        notes: data.notes,
        is_active: true,
      },
    });

    return contact;
  }

  /**
   * Update contact details.
   */
  async update(orgId: string, id: string, data: Record<string, any>) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, org_id: orgId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Validate GSTIN if being updated
    if (data.gstin) {
      const gstinResult = validateGstin(data.gstin);
      if (!gstinResult.valid) {
        throw new BadRequestException(`Invalid GSTIN: ${gstinResult.error}`);
      }

      // Check for duplicate GSTIN within the same org (exclude current contact)
      const existingGstin = await this.prisma.contact.findFirst({
        where: { org_id: orgId, gstin: data.gstin, id: { not: id } },
      });
      if (existingGstin) {
        throw new BadRequestException(
          `A contact with GSTIN ${data.gstin} already exists: ${existingGstin.name}`,
        );
      }
    }

    // Check for duplicate phone within the same org (exclude current contact)
    if (data.phone) {
      const existingPhone = await this.prisma.contact.findFirst({
        where: { org_id: orgId, phone: data.phone, id: { not: id } },
      });
      if (existingPhone) {
        throw new BadRequestException(
          `A contact with phone ${data.phone} already exists: ${existingPhone.name}`,
        );
      }
    }

    // Only pass known Contact model fields to Prisma
    const allowedFields = [
      'type', 'name', 'company_name', 'gstin', 'pan', 'email', 'phone',
      'whatsapp', 'billing_address', 'shipping_address', 'payment_terms',
      'credit_limit', 'opening_balance', 'notes', 'is_active',
    ];
    const cleanData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in data) {
        cleanData[key] = data[key];
      }
    }

    return this.prisma.contact.update({
      where: { id },
      data: cleanData,
    });
  }

  /**
   * Soft-delete (deactivate) a contact.
   */
  async deactivate(orgId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, org_id: orgId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: 'Contact deactivated successfully' };
  }

  /**
   * Get paginated transactions (invoices + payments) for a contact.
   */
  async getTransactions(
    orgId: string,
    id: string,
    filters: { page: number; limit: number; type?: string },
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const { type } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const results: any[] = [];

    if (!type || type === 'invoice') {
      const invoices = await this.prisma.invoice.findMany({
        where: { org_id: orgId, contact_id: id },
        select: {
          id: true,
          invoice_number: true,
          type: true,
          status: true,
          date: true,
          due_date: true,
          total: true,
          balance_due: true,
          amount_paid: true,
        },
        orderBy: { date: 'desc' },
      });

      invoices.forEach((inv) => {
        results.push({
          id: inv.id,
          transaction_type: 'invoice',
          number: inv.invoice_number,
          type: inv.type,
          status: inv.status,
          date: inv.date,
          due_date: inv.due_date,
          amount: inv.total,
          balance_due: inv.balance_due,
        });
      });
    }

    if (!type || type === 'payment') {
      const payments = await this.prisma.payment.findMany({
        where: { org_id: orgId, contact_id: id },
        select: {
          id: true,
          type: true,
          amount: true,
          date: true,
          method: true,
          reference: true,
        },
        orderBy: { date: 'desc' },
      });

      payments.forEach((pmt) => {
        results.push({
          id: pmt.id,
          transaction_type: 'payment',
          type: pmt.type,
          date: pmt.date,
          amount: pmt.amount,
          method: pmt.method,
          reference: pmt.reference,
        });
      });
    }

    // Sort by date descending
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = results.length;
    const paginated = results.slice(skip, skip + limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get outstanding invoices for a contact with aging breakdown.
   */
  async getOutstanding(orgId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        contact_id: id,
        status: { in: ['sent', 'partially_paid', 'overdue'] },
      },
      select: {
        id: true,
        invoice_number: true,
        type: true,
        status: true,
        date: true,
        due_date: true,
        total: true,
        balance_due: true,
        amount_paid: true,
      },
      orderBy: { date: 'asc' },
    });

    const now = new Date();
    const aging = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 };
    let totalOutstanding = 0;

    const invoicesWithAging = invoices
      .filter((inv) => {
        const balance = inv.balance_due?.toNumber() || 0;
        return balance > 0;
      })
      .map((inv) => {
        const balance = inv.balance_due?.toNumber() || 0;
        const dueDate = inv.due_date || inv.date;
        const daysPastDue = Math.floor(
          (now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
        );

        totalOutstanding += balance;

        let bucket: string;
        if (daysPastDue <= 0) {
          aging.current += balance;
          bucket = 'current';
        } else if (daysPastDue <= 30) {
          aging.days_1_30 += balance;
          bucket = '1-30';
        } else if (daysPastDue <= 60) {
          aging.days_31_60 += balance;
          bucket = '31-60';
        } else if (daysPastDue <= 90) {
          aging.days_61_90 += balance;
          bucket = '61-90';
        } else {
          aging.days_90_plus += balance;
          bucket = '90+';
        }

        return {
          ...inv,
          days_past_due: Math.max(0, daysPastDue),
          aging_bucket: bucket,
        };
      });

    const round = (n: number) => Math.round(n * 100) / 100;

    return {
      total_outstanding: round(totalOutstanding),
      aging: {
        current: round(aging.current),
        days_1_30: round(aging.days_1_30),
        days_31_60: round(aging.days_31_60),
        days_61_90: round(aging.days_61_90),
        days_90_plus: round(aging.days_90_plus),
      },
      invoices: invoicesWithAging,
    };
  }

  /**
   * Get contact summary stats: total revenue, outstanding, invoice count, last transaction.
   */
  async getSummary(orgId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, org_id: orgId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { org_id: orgId, contact_id: id },
      select: {
        total: true,
        balance_due: true,
        status: true,
        date: true,
      },
      orderBy: { date: 'desc' },
    });

    const payments = await this.prisma.payment.findMany({
      where: { org_id: orgId, contact_id: id },
      select: { date: true },
      orderBy: { date: 'desc' },
      take: 1,
    });

    let totalRevenue = 0;
    let totalOutstanding = 0;
    let lastTransactionDate: Date | null = null;

    for (const inv of invoices) {
      totalRevenue += inv.total?.toNumber() || 0;
      if (['sent', 'partially_paid', 'overdue'].includes(inv.status)) {
        totalOutstanding += inv.balance_due?.toNumber() || 0;
      }
    }

    // Last transaction is the latest of invoice date or payment date
    if (invoices.length > 0) {
      lastTransactionDate = invoices[0].date;
    }
    if (payments.length > 0 && payments[0].date) {
      if (!lastTransactionDate || payments[0].date > lastTransactionDate) {
        lastTransactionDate = payments[0].date;
      }
    }

    const round = (n: number) => Math.round(n * 100) / 100;

    return {
      total_revenue: round(totalRevenue),
      total_outstanding: round(totalOutstanding),
      total_invoices: invoices.length,
      last_transaction_date: lastTransactionDate,
    };
  }

  /**
   * Get contact's outstanding balance from invoices.
   */
  async getBalance(orgId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, org_id: orgId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Sum outstanding invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        contact_id: id,
        status: { in: ['sent', 'partially_paid', 'overdue'] },
      },
      select: {
        id: true,
        invoice_number: true,
        total: true,
        amount_paid: true,
        balance_due: true,
        date: true,
        due_date: true,
        status: true,
        type: true,
      },
      orderBy: { date: 'asc' },
    });

    const totalOutstanding = invoices.reduce(
      (sum, inv) => sum + (inv.balance_due?.toNumber() || 0),
      0,
    );

    return {
      contact_id: id,
      contact_name: contact.name,
      opening_balance: contact.opening_balance,
      total_outstanding: Math.round(totalOutstanding * 100) / 100,
      invoices,
    };
  }
}
