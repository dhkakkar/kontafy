import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AgingBucket,
  GeneralLedgerQuery,
  DayBookQuery,
  AgingQuery,
  SalesRegisterQuery,
  PurchaseRegisterQuery,
  StockSummaryQuery,
  StockMovementQuery,
  GstSummaryQuery,
  TdsSummaryQuery,
} from './dto/reports.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════

  private toNum(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber();
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════
  // General Ledger (full / multi-account)
  // ═══════════════════════════════════════════════════════════════

  async getGeneralLedger(orgId: string, query: GeneralLedgerQuery) {
    const from = query.fromDate ? new Date(query.fromDate) : undefined;
    const to = query.toDate ? new Date(query.toDate) : undefined;

    // Build account filter
    const accountWhere: any = { org_id: orgId, is_active: true };
    if (query.accountId) accountWhere.id = query.accountId;
    if (query.accountType) accountWhere.type = query.accountType;

    const accounts = await this.prisma.account.findMany({
      where: accountWhere,
      orderBy: { code: 'asc' },
    });

    const dateFilter: any = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;

    const result = [];

    for (const account of accounts) {
      // Opening balance
      let openingBalance = this.toNum(account.opening_balance);

      if (from) {
        const priorLines = await this.prisma.journalLine.findMany({
          where: {
            account_id: account.id,
            entry: { org_id: orgId, is_posted: true, date: { lt: from } },
          },
          select: { debit: true, credit: true },
        });

        for (const line of priorLines) {
          const d = this.toNum(line.debit);
          const c = this.toNum(line.credit);
          if (['asset', 'expense'].includes(account.type)) {
            openingBalance += d - c;
          } else {
            openingBalance += c - d;
          }
        }
      }

      // Transaction lines in range
      const entryDateWhere: any = { org_id: orgId, is_posted: true };
      if (Object.keys(dateFilter).length > 0) entryDateWhere.date = dateFilter;

      const lines = await this.prisma.journalLine.findMany({
        where: {
          account_id: account.id,
          entry: entryDateWhere,
        },
        include: {
          entry: {
            select: {
              date: true,
              entry_number: true,
              narration: true,
              reference: true,
              reference_type: true,
            },
          },
        },
        orderBy: { entry: { date: 'asc' } },
      });

      if (lines.length === 0 && !query.accountId) continue; // skip zero-activity accounts in full ledger

      let runningBalance = openingBalance;
      const transactions = lines.map((line) => {
        const debit = this.toNum(line.debit);
        const credit = this.toNum(line.credit);

        if (['asset', 'expense'].includes(account.type)) {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }

        return {
          date: line.entry.date,
          entry_number: line.entry.entry_number,
          narration: line.entry.narration,
          reference: line.entry.reference,
          reference_type: line.entry.reference_type,
          description: line.description,
          debit: this.round(debit),
          credit: this.round(credit),
          balance: this.round(runningBalance),
        };
      });

      result.push({
        account: {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          sub_type: account.sub_type,
        },
        opening_balance: this.round(openingBalance),
        transactions,
        closing_balance: this.round(runningBalance),
        total_debit: this.round(transactions.reduce((s, t) => s + t.debit, 0)),
        total_credit: this.round(transactions.reduce((s, t) => s + t.credit, 0)),
      });
    }

    return {
      from_date: query.fromDate || null,
      to_date: query.toDate || null,
      accounts: result,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Day Book (journal register for a date range)
  // ═══════════════════════════════════════════════════════════════

  async getDayBook(orgId: string, query: DayBookQuery) {
    const from = new Date(query.fromDate);
    const to = new Date(query.toDate);
    const skip = (query.page - 1) * query.limit;

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where: {
          org_id: orgId,
          is_posted: true,
          date: { gte: from, lte: to },
        },
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, code: true, name: true, type: true },
              },
            },
          },
        },
        orderBy: [{ date: 'asc' }, { entry_number: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.journalEntry.count({
        where: {
          org_id: orgId,
          is_posted: true,
          date: { gte: from, lte: to },
        },
      }),
    ]);

    let totalDebit = 0;
    let totalCredit = 0;

    const dayBookEntries = entries.map((entry) => {
      const lines = entry.lines.map((line) => {
        const debit = this.toNum(line.debit);
        const credit = this.toNum(line.credit);
        totalDebit += debit;
        totalCredit += credit;

        return {
          account_id: line.account.id,
          account_code: line.account.code,
          account_name: line.account.name,
          account_type: line.account.type,
          description: line.description,
          debit: this.round(debit),
          credit: this.round(credit),
        };
      });

      return {
        id: entry.id,
        entry_number: entry.entry_number,
        date: entry.date,
        narration: entry.narration,
        reference: entry.reference,
        reference_type: entry.reference_type,
        lines,
      };
    });

    return {
      from_date: query.fromDate,
      to_date: query.toDate,
      entries: dayBookEntries,
      totals: {
        entries_count: total,
        debit: this.round(totalDebit),
        credit: this.round(totalCredit),
      },
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Receivable Aging (AR)
  // ═══════════════════════════════════════════════════════════════

  async getReceivableAging(orgId: string, query: AgingQuery) {
    const asOf = query.asOfDate ? new Date(query.asOfDate) : new Date();

    const where: any = {
      org_id: orgId,
      type: 'sale',
      status: { in: ['sent', 'partially_paid', 'overdue'] },
      balance_due: { gt: 0 },
    };

    if (query.contactId) where.contact_id = query.contactId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, company_name: true },
        },
      },
    });

    const contactMap = new Map<string, AgingBucket>();

    for (const inv of invoices) {
      if (!inv.contact) continue;

      const dueDate = inv.due_date || inv.date;
      const daysPastDue = Math.floor(
        (asOf.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      const balance = this.toNum(inv.balance_due);

      const existing = contactMap.get(inv.contact.id) || {
        contact_id: inv.contact.id,
        contact_name: inv.contact.name,
        company_name: inv.contact.company_name,
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_90_plus: 0,
        total: 0,
      };

      if (daysPastDue <= 0) {
        existing.current += balance;
      } else if (daysPastDue <= 30) {
        existing.days_1_30 += balance;
      } else if (daysPastDue <= 60) {
        existing.days_31_60 += balance;
      } else if (daysPastDue <= 90) {
        existing.days_61_90 += balance;
      } else {
        existing.days_90_plus += balance;
      }
      existing.total += balance;

      contactMap.set(inv.contact.id, existing);
    }

    const buckets = Array.from(contactMap.values()).map((b) => ({
      ...b,
      current: this.round(b.current),
      days_1_30: this.round(b.days_1_30),
      days_31_60: this.round(b.days_31_60),
      days_61_90: this.round(b.days_61_90),
      days_90_plus: this.round(b.days_90_plus),
      total: this.round(b.total),
    }));

    const totals = {
      current: this.round(buckets.reduce((s, b) => s + b.current, 0)),
      days_1_30: this.round(buckets.reduce((s, b) => s + b.days_1_30, 0)),
      days_31_60: this.round(buckets.reduce((s, b) => s + b.days_31_60, 0)),
      days_61_90: this.round(buckets.reduce((s, b) => s + b.days_61_90, 0)),
      days_90_plus: this.round(buckets.reduce((s, b) => s + b.days_90_plus, 0)),
      total: this.round(buckets.reduce((s, b) => s + b.total, 0)),
    };

    return {
      as_of: asOf.toISOString().split('T')[0],
      buckets: buckets.sort((a, b) => b.total - a.total),
      totals,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Payable Aging (AP)
  // ═══════════════════════════════════════════════════════════════

  async getPayableAging(orgId: string, query: AgingQuery) {
    const asOf = query.asOfDate ? new Date(query.asOfDate) : new Date();

    const where: any = {
      org_id: orgId,
      type: 'purchase',
      status: { in: ['sent', 'partially_paid', 'overdue'] },
      balance_due: { gt: 0 },
    };

    if (query.contactId) where.contact_id = query.contactId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, company_name: true },
        },
      },
    });

    const contactMap = new Map<string, AgingBucket>();

    for (const inv of invoices) {
      if (!inv.contact) continue;

      const dueDate = inv.due_date || inv.date;
      const daysPastDue = Math.floor(
        (asOf.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      const balance = this.toNum(inv.balance_due);

      const existing = contactMap.get(inv.contact.id) || {
        contact_id: inv.contact.id,
        contact_name: inv.contact.name,
        company_name: inv.contact.company_name,
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_90_plus: 0,
        total: 0,
      };

      if (daysPastDue <= 0) {
        existing.current += balance;
      } else if (daysPastDue <= 30) {
        existing.days_1_30 += balance;
      } else if (daysPastDue <= 60) {
        existing.days_31_60 += balance;
      } else if (daysPastDue <= 90) {
        existing.days_61_90 += balance;
      } else {
        existing.days_90_plus += balance;
      }
      existing.total += balance;

      contactMap.set(inv.contact.id, existing);
    }

    const buckets = Array.from(contactMap.values()).map((b) => ({
      ...b,
      current: this.round(b.current),
      days_1_30: this.round(b.days_1_30),
      days_31_60: this.round(b.days_31_60),
      days_61_90: this.round(b.days_61_90),
      days_90_plus: this.round(b.days_90_plus),
      total: this.round(b.total),
    }));

    const totals = {
      current: this.round(buckets.reduce((s, b) => s + b.current, 0)),
      days_1_30: this.round(buckets.reduce((s, b) => s + b.days_1_30, 0)),
      days_31_60: this.round(buckets.reduce((s, b) => s + b.days_31_60, 0)),
      days_61_90: this.round(buckets.reduce((s, b) => s + b.days_61_90, 0)),
      days_90_plus: this.round(buckets.reduce((s, b) => s + b.days_90_plus, 0)),
      total: this.round(buckets.reduce((s, b) => s + b.total, 0)),
    };

    return {
      as_of: asOf.toISOString().split('T')[0],
      buckets: buckets.sort((a, b) => b.total - a.total),
      totals,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Sales Register
  // ═══════════════════════════════════════════════════════════════

  async getSalesRegister(orgId: string, query: SalesRegisterQuery) {
    const from = new Date(query.fromDate);
    const to = new Date(query.toDate);

    const where: any = {
      org_id: orgId,
      type: 'sale',
      date: { gte: from, lte: to },
      status: { not: 'cancelled' },
    };

    if (query.contactId) where.contact_id = query.contactId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, company_name: true, gstin: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Build individual entries
    const entries = invoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      date: inv.date,
      status: inv.status,
      contact: inv.contact
        ? {
            id: inv.contact.id,
            name: inv.contact.name,
            company_name: inv.contact.company_name,
            gstin: inv.contact.gstin,
          }
        : null,
      subtotal: this.round(this.toNum(inv.subtotal)),
      discount: this.round(this.toNum(inv.discount_amount)),
      tax_amount: this.round(this.toNum(inv.tax_amount)),
      total: this.round(this.toNum(inv.total)),
      amount_paid: this.round(this.toNum(inv.amount_paid)),
      balance_due: this.round(this.toNum(inv.balance_due)),
      items: inv.items.map((item) => ({
        description: item.description,
        product: item.product,
        hsn_code: item.hsn_code,
        quantity: this.toNum(item.quantity),
        rate: this.toNum(item.rate),
        taxable_amount: this.round(this.toNum(item.taxable_amount)),
        cgst: this.round(this.toNum(item.cgst_amount)),
        sgst: this.round(this.toNum(item.sgst_amount)),
        igst: this.round(this.toNum(item.igst_amount)),
        total: this.round(this.toNum(item.total)),
      })),
    }));

    // Group summary by selected dimension
    let grouped: any[] = [];

    if (query.groupBy === 'customer') {
      const groupMap = new Map<string, any>();
      for (const entry of entries) {
        const key = entry.contact?.id || 'unknown';
        const existing = groupMap.get(key) || {
          contact_id: entry.contact?.id || null,
          contact_name: entry.contact?.name || 'Walk-in',
          company_name: entry.contact?.company_name || null,
          invoice_count: 0,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
        };
        existing.invoice_count += 1;
        existing.subtotal += entry.subtotal;
        existing.tax_amount += entry.tax_amount;
        existing.total += entry.total;
        groupMap.set(key, existing);
      }
      grouped = Array.from(groupMap.values())
        .map((g) => ({
          ...g,
          subtotal: this.round(g.subtotal),
          tax_amount: this.round(g.tax_amount),
          total: this.round(g.total),
        }))
        .sort((a, b) => b.total - a.total);
    } else if (query.groupBy === 'product') {
      const groupMap = new Map<string, any>();
      for (const entry of entries) {
        for (const item of entry.items) {
          const key = item.product?.id || item.description;
          const existing = groupMap.get(key) || {
            product_id: item.product?.id || null,
            product_name: item.product?.name || item.description,
            sku: item.product?.sku || null,
            quantity_sold: 0,
            total_amount: 0,
          };
          existing.quantity_sold += item.quantity;
          existing.total_amount += item.total;
          groupMap.set(key, existing);
        }
      }
      grouped = Array.from(groupMap.values())
        .map((g) => ({
          ...g,
          quantity_sold: this.round(g.quantity_sold),
          total_amount: this.round(g.total_amount),
        }))
        .sort((a, b) => b.total_amount - a.total_amount);
    } else if (query.groupBy === 'month') {
      const groupMap = new Map<string, any>();
      for (const entry of entries) {
        const d = new Date(entry.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const existing = groupMap.get(key) || {
          month: key,
          invoice_count: 0,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
        };
        existing.invoice_count += 1;
        existing.subtotal += entry.subtotal;
        existing.tax_amount += entry.tax_amount;
        existing.total += entry.total;
        groupMap.set(key, existing);
      }
      grouped = Array.from(groupMap.values())
        .map((g) => ({
          ...g,
          subtotal: this.round(g.subtotal),
          tax_amount: this.round(g.tax_amount),
          total: this.round(g.total),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }

    const totals = {
      invoice_count: entries.length,
      subtotal: this.round(entries.reduce((s, e) => s + e.subtotal, 0)),
      discount: this.round(entries.reduce((s, e) => s + e.discount, 0)),
      tax_amount: this.round(entries.reduce((s, e) => s + e.tax_amount, 0)),
      total: this.round(entries.reduce((s, e) => s + e.total, 0)),
      amount_paid: this.round(entries.reduce((s, e) => s + e.amount_paid, 0)),
      balance_due: this.round(entries.reduce((s, e) => s + e.balance_due, 0)),
    };

    return {
      from_date: query.fromDate,
      to_date: query.toDate,
      group_by: query.groupBy,
      entries,
      grouped,
      totals,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Purchase Register
  // ═══════════════════════════════════════════════════════════════

  async getPurchaseRegister(orgId: string, query: PurchaseRegisterQuery) {
    const from = new Date(query.fromDate);
    const to = new Date(query.toDate);

    const where: any = {
      org_id: orgId,
      type: 'purchase',
      date: { gte: from, lte: to },
      status: { not: 'cancelled' },
    };

    if (query.contactId) where.contact_id = query.contactId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, company_name: true, gstin: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const entries = invoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      date: inv.date,
      status: inv.status,
      contact: inv.contact
        ? {
            id: inv.contact.id,
            name: inv.contact.name,
            company_name: inv.contact.company_name,
            gstin: inv.contact.gstin,
          }
        : null,
      subtotal: this.round(this.toNum(inv.subtotal)),
      discount: this.round(this.toNum(inv.discount_amount)),
      tax_amount: this.round(this.toNum(inv.tax_amount)),
      total: this.round(this.toNum(inv.total)),
      amount_paid: this.round(this.toNum(inv.amount_paid)),
      balance_due: this.round(this.toNum(inv.balance_due)),
      items: inv.items.map((item) => ({
        description: item.description,
        product: item.product,
        hsn_code: item.hsn_code,
        quantity: this.toNum(item.quantity),
        rate: this.toNum(item.rate),
        taxable_amount: this.round(this.toNum(item.taxable_amount)),
        cgst: this.round(this.toNum(item.cgst_amount)),
        sgst: this.round(this.toNum(item.sgst_amount)),
        igst: this.round(this.toNum(item.igst_amount)),
        total: this.round(this.toNum(item.total)),
      })),
    }));

    // Group by dimension
    let grouped: any[] = [];

    if (query.groupBy === 'vendor') {
      const groupMap = new Map<string, any>();
      for (const entry of entries) {
        const key = entry.contact?.id || 'unknown';
        const existing = groupMap.get(key) || {
          contact_id: entry.contact?.id || null,
          contact_name: entry.contact?.name || 'Unknown Vendor',
          company_name: entry.contact?.company_name || null,
          invoice_count: 0,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
        };
        existing.invoice_count += 1;
        existing.subtotal += entry.subtotal;
        existing.tax_amount += entry.tax_amount;
        existing.total += entry.total;
        groupMap.set(key, existing);
      }
      grouped = Array.from(groupMap.values())
        .map((g) => ({
          ...g,
          subtotal: this.round(g.subtotal),
          tax_amount: this.round(g.tax_amount),
          total: this.round(g.total),
        }))
        .sort((a, b) => b.total - a.total);
    } else if (query.groupBy === 'product') {
      const groupMap = new Map<string, any>();
      for (const entry of entries) {
        for (const item of entry.items) {
          const key = item.product?.id || item.description;
          const existing = groupMap.get(key) || {
            product_id: item.product?.id || null,
            product_name: item.product?.name || item.description,
            sku: item.product?.sku || null,
            quantity_purchased: 0,
            total_amount: 0,
          };
          existing.quantity_purchased += item.quantity;
          existing.total_amount += item.total;
          groupMap.set(key, existing);
        }
      }
      grouped = Array.from(groupMap.values())
        .map((g) => ({
          ...g,
          quantity_purchased: this.round(g.quantity_purchased),
          total_amount: this.round(g.total_amount),
        }))
        .sort((a, b) => b.total_amount - a.total_amount);
    } else if (query.groupBy === 'month') {
      const groupMap = new Map<string, any>();
      for (const entry of entries) {
        const d = new Date(entry.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const existing = groupMap.get(key) || {
          month: key,
          invoice_count: 0,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
        };
        existing.invoice_count += 1;
        existing.subtotal += entry.subtotal;
        existing.tax_amount += entry.tax_amount;
        existing.total += entry.total;
        groupMap.set(key, existing);
      }
      grouped = Array.from(groupMap.values())
        .map((g) => ({
          ...g,
          subtotal: this.round(g.subtotal),
          tax_amount: this.round(g.tax_amount),
          total: this.round(g.total),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }

    const totals = {
      invoice_count: entries.length,
      subtotal: this.round(entries.reduce((s, e) => s + e.subtotal, 0)),
      discount: this.round(entries.reduce((s, e) => s + e.discount, 0)),
      tax_amount: this.round(entries.reduce((s, e) => s + e.tax_amount, 0)),
      total: this.round(entries.reduce((s, e) => s + e.total, 0)),
      amount_paid: this.round(entries.reduce((s, e) => s + e.amount_paid, 0)),
      balance_due: this.round(entries.reduce((s, e) => s + e.balance_due, 0)),
    };

    return {
      from_date: query.fromDate,
      to_date: query.toDate,
      group_by: query.groupBy,
      entries,
      grouped,
      totals,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Stock Summary
  // ═══════════════════════════════════════════════════════════════

  async getStockSummary(orgId: string, query: StockSummaryQuery) {
    const levelWhere: any = { org_id: orgId };
    if (query.productId) levelWhere.product_id = query.productId;
    if (query.warehouseId) levelWhere.warehouse_id = query.warehouseId;

    const levels = await this.prisma.stockLevel.findMany({
      where: levelWhere,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            purchase_price: true,
            selling_price: true,
            reorder_level: true,
            track_inventory: true,
            hsn_code: true,
          },
        },
        warehouse: {
          select: { id: true, name: true, is_default: true },
        },
      },
      orderBy: [{ product: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
    });

    // Aggregate by product
    const productMap = new Map<string, any>();

    for (const level of levels) {
      const qty = this.toNum(level.quantity);
      const purchasePrice = this.toNum(level.product.purchase_price);
      const sellingPrice = this.toNum(level.product.selling_price);
      const reorderLevel = this.toNum(level.product.reorder_level);

      const existing = productMap.get(level.product.id) || {
        product_id: level.product.id,
        name: level.product.name,
        sku: level.product.sku,
        unit: level.product.unit,
        hsn_code: level.product.hsn_code,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        reorder_level: reorderLevel,
        total_quantity: 0,
        total_stock_value: 0,
        total_selling_value: 0,
        below_reorder: false,
        warehouses: [],
      };

      existing.total_quantity += qty;
      existing.total_stock_value += qty * purchasePrice;
      existing.total_selling_value += qty * sellingPrice;
      existing.warehouses.push({
        warehouse_id: level.warehouse.id,
        warehouse_name: level.warehouse.name,
        is_default: level.warehouse.is_default,
        quantity: this.round(qty),
        stock_value: this.round(qty * purchasePrice),
      });

      productMap.set(level.product.id, existing);
    }

    let items = Array.from(productMap.values()).map((p) => ({
      ...p,
      total_quantity: this.round(p.total_quantity),
      total_stock_value: this.round(p.total_stock_value),
      total_selling_value: this.round(p.total_selling_value),
      below_reorder: p.reorder_level > 0 && p.total_quantity <= p.reorder_level,
    }));

    if (query.belowReorder) {
      items = items.filter((i) => i.below_reorder);
    }

    const totals = {
      total_items: items.length,
      total_quantity: this.round(items.reduce((s, i) => s + i.total_quantity, 0)),
      total_stock_value: this.round(items.reduce((s, i) => s + i.total_stock_value, 0)),
      total_selling_value: this.round(items.reduce((s, i) => s + i.total_selling_value, 0)),
      below_reorder_count: items.filter((i) => i.below_reorder).length,
    };

    return { items, totals };
  }

  // ═══════════════════════════════════════════════════════════════
  // Stock Movement Report
  // ═══════════════════════════════════════════════════════════════

  async getStockMovement(orgId: string, query: StockMovementQuery) {
    const from = new Date(query.fromDate);
    const to = new Date(query.toDate);
    to.setHours(23, 59, 59, 999);

    const where: any = {
      org_id: orgId,
      created_at: { gte: from, lte: to },
    };

    if (query.productId) where.product_id = query.productId;
    if (query.warehouseId) where.warehouse_id = query.warehouseId;
    if (query.type) where.type = query.type;

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true },
        },
        warehouse: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const entries = movements.map((m) => ({
      id: m.id,
      date: m.created_at,
      product: m.product,
      warehouse: m.warehouse,
      type: m.type,
      quantity: this.toNum(m.quantity),
      cost_price: this.round(this.toNum(m.cost_price)),
      reference_type: m.reference_type,
      batch_number: m.batch_number,
      serial_number: m.serial_number,
      notes: m.notes,
    }));

    // Summary by type
    const typeMap = new Map<string, { count: number; total_quantity: number }>();
    for (const entry of entries) {
      const existing = typeMap.get(entry.type) || { count: 0, total_quantity: 0 };
      existing.count += 1;
      existing.total_quantity += entry.quantity;
      typeMap.set(entry.type, existing);
    }

    const summary_by_type = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      total_quantity: this.round(data.total_quantity),
    }));

    // Summary by product
    const productMap = new Map<string, { name: string; in_qty: number; out_qty: number }>();
    for (const entry of entries) {
      const existing = productMap.get(entry.product.id) || {
        name: entry.product.name,
        in_qty: 0,
        out_qty: 0,
      };
      if (entry.type === 'purchase_in' || entry.type === 'adjustment') {
        existing.in_qty += entry.quantity;
      } else {
        existing.out_qty += entry.quantity;
      }
      productMap.set(entry.product.id, existing);
    }

    const summary_by_product = Array.from(productMap.entries()).map(([id, data]) => ({
      product_id: id,
      product_name: data.name,
      total_in: this.round(data.in_qty),
      total_out: this.round(data.out_qty),
      net: this.round(data.in_qty - data.out_qty),
    }));

    return {
      from_date: query.fromDate,
      to_date: query.toDate,
      entries,
      summary_by_type,
      summary_by_product,
      totals: {
        total_movements: entries.length,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // GST Summary
  // ═══════════════════════════════════════════════════════════════

  async getGstSummary(orgId: string, query: GstSummaryQuery) {
    const from = new Date(query.fromDate);
    const to = new Date(query.toDate);

    // Sales invoices for output tax
    const salesInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'sale',
        date: { gte: from, lte: to },
        status: { not: 'cancelled' },
      },
      include: { items: true },
    });

    // Purchase invoices for input tax
    const purchaseInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'purchase',
        date: { gte: from, lte: to },
        status: { not: 'cancelled' },
      },
      include: { items: true },
    });

    // Compute output GST
    let outputCgst = 0;
    let outputSgst = 0;
    let outputIgst = 0;
    let outputCess = 0;
    let outputTaxableAmount = 0;

    const rateWiseOutput = new Map<number, any>();

    for (const inv of salesInvoices) {
      for (const item of inv.items) {
        const taxable = this.toNum(item.taxable_amount);
        const cgst = this.toNum(item.cgst_amount);
        const sgst = this.toNum(item.sgst_amount);
        const igst = this.toNum(item.igst_amount);
        const cess = this.toNum(item.cess_amount);

        outputTaxableAmount += taxable;
        outputCgst += cgst;
        outputSgst += sgst;
        outputIgst += igst;
        outputCess += cess;

        const rate = this.toNum(item.cgst_rate) + this.toNum(item.sgst_rate) + this.toNum(item.igst_rate);
        if (rate > 0) {
          const existing = rateWiseOutput.get(rate) || {
            rate,
            taxable_amount: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            cess: 0,
          };
          existing.taxable_amount += taxable;
          existing.cgst += cgst;
          existing.sgst += sgst;
          existing.igst += igst;
          existing.cess += cess;
          rateWiseOutput.set(rate, existing);
        }
      }
    }

    // Compute input GST
    let inputCgst = 0;
    let inputSgst = 0;
    let inputIgst = 0;
    let inputCess = 0;
    let inputTaxableAmount = 0;

    const rateWiseInput = new Map<number, any>();

    for (const inv of purchaseInvoices) {
      for (const item of inv.items) {
        const taxable = this.toNum(item.taxable_amount);
        const cgst = this.toNum(item.cgst_amount);
        const sgst = this.toNum(item.sgst_amount);
        const igst = this.toNum(item.igst_amount);
        const cess = this.toNum(item.cess_amount);

        inputTaxableAmount += taxable;
        inputCgst += cgst;
        inputSgst += sgst;
        inputIgst += igst;
        inputCess += cess;

        const rate = this.toNum(item.cgst_rate) + this.toNum(item.sgst_rate) + this.toNum(item.igst_rate);
        if (rate > 0) {
          const existing = rateWiseInput.get(rate) || {
            rate,
            taxable_amount: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            cess: 0,
          };
          existing.taxable_amount += taxable;
          existing.cgst += cgst;
          existing.sgst += sgst;
          existing.igst += igst;
          existing.cess += cess;
          rateWiseInput.set(rate, existing);
        }
      }
    }

    const roundMap = (m: Map<number, any>) =>
      Array.from(m.values())
        .map((v) => ({
          ...v,
          taxable_amount: this.round(v.taxable_amount),
          cgst: this.round(v.cgst),
          sgst: this.round(v.sgst),
          igst: this.round(v.igst),
          cess: this.round(v.cess),
          total_tax: this.round(v.cgst + v.sgst + v.igst + v.cess),
        }))
        .sort((a, b) => a.rate - b.rate);

    const netCgst = outputCgst - inputCgst;
    const netSgst = outputSgst - inputSgst;
    const netIgst = outputIgst - inputIgst;
    const netCess = outputCess - inputCess;

    return {
      from_date: query.fromDate,
      to_date: query.toDate,
      output_tax: {
        invoice_count: salesInvoices.length,
        taxable_amount: this.round(outputTaxableAmount),
        cgst: this.round(outputCgst),
        sgst: this.round(outputSgst),
        igst: this.round(outputIgst),
        cess: this.round(outputCess),
        total_tax: this.round(outputCgst + outputSgst + outputIgst + outputCess),
        rate_wise: roundMap(rateWiseOutput),
      },
      input_tax: {
        invoice_count: purchaseInvoices.length,
        taxable_amount: this.round(inputTaxableAmount),
        cgst: this.round(inputCgst),
        sgst: this.round(inputSgst),
        igst: this.round(inputIgst),
        cess: this.round(inputCess),
        total_tax: this.round(inputCgst + inputSgst + inputIgst + inputCess),
        rate_wise: roundMap(rateWiseInput),
      },
      net_liability: {
        cgst: this.round(netCgst),
        sgst: this.round(netSgst),
        igst: this.round(netIgst),
        cess: this.round(netCess),
        total: this.round(netCgst + netSgst + netIgst + netCess),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TDS Summary
  // ═══════════════════════════════════════════════════════════════

  async getTdsSummary(orgId: string, query: TdsSummaryQuery) {
    const from = new Date(query.fromDate);
    const to = new Date(query.toDate);

    const where: any = {
      org_id: orgId,
      transaction_date: { gte: from, lte: to },
    };

    if (query.section) where.section = query.section;

    const entries = await this.prisma.tdsEntry.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, company_name: true, pan: true },
        },
      },
      orderBy: { transaction_date: 'asc' },
    });

    const items = entries.map((e) => ({
      id: e.id,
      date: e.transaction_date,
      section: e.section,
      contact: e.contact
        ? {
            id: e.contact.id,
            name: e.contact.name,
            company_name: e.contact.company_name,
            pan: e.contact.pan,
          }
        : null,
      gross_amount: this.round(this.toNum(e.gross_amount)),
      tds_rate: this.toNum(e.tds_rate),
      tds_amount: this.round(this.toNum(e.tds_amount)),
      status: e.status,
    }));

    // Section-wise summary
    const sectionMap = new Map<string, any>();
    for (const item of items) {
      const existing = sectionMap.get(item.section) || {
        section: item.section,
        entry_count: 0,
        total_gross_amount: 0,
        total_tds_amount: 0,
        entries_pending: 0,
        entries_deposited: 0,
      };
      existing.entry_count += 1;
      existing.total_gross_amount += item.gross_amount;
      existing.total_tds_amount += item.tds_amount;
      if (item.status === 'pending') existing.entries_pending += 1;
      if (item.status === 'deposited') existing.entries_deposited += 1;
      sectionMap.set(item.section, existing);
    }

    const section_summary = Array.from(sectionMap.values()).map((s) => ({
      ...s,
      total_gross_amount: this.round(s.total_gross_amount),
      total_tds_amount: this.round(s.total_tds_amount),
    }));

    // Deductee-wise summary
    const deducteeMap = new Map<string, any>();
    for (const item of items) {
      if (!item.contact) continue;
      const key = item.contact.id;
      const existing = deducteeMap.get(key) || {
        contact_id: item.contact.id,
        name: item.contact.name,
        pan: item.contact.pan,
        total_gross_amount: 0,
        total_tds_amount: 0,
        entry_count: 0,
      };
      existing.total_gross_amount += item.gross_amount;
      existing.total_tds_amount += item.tds_amount;
      existing.entry_count += 1;
      deducteeMap.set(key, existing);
    }

    const deductee_summary = Array.from(deducteeMap.values())
      .map((d) => ({
        ...d,
        total_gross_amount: this.round(d.total_gross_amount),
        total_tds_amount: this.round(d.total_tds_amount),
      }))
      .sort((a, b) => b.total_tds_amount - a.total_tds_amount);

    const totals = {
      entry_count: items.length,
      total_gross_amount: this.round(items.reduce((s, i) => s + i.gross_amount, 0)),
      total_tds_amount: this.round(items.reduce((s, i) => s + i.tds_amount, 0)),
      pending_count: items.filter((i) => i.status === 'pending').length,
      deposited_count: items.filter((i) => i.status === 'deposited').length,
      pending_amount: this.round(
        items.filter((i) => i.status === 'pending').reduce((s, i) => s + i.tds_amount, 0),
      ),
    };

    return {
      from_date: query.fromDate,
      to_date: query.toDate,
      entries: items,
      section_summary,
      deductee_summary,
      totals,
    };
  }
}
