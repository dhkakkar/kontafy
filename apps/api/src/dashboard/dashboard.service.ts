import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────

  private toNumber(val: Decimal | number | null | undefined): number {
    if (val === null || val === undefined) return 0;
    return typeof val === 'number' ? val : Number(val);
  }

  private percentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private monthRange(monthsAgo: number): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // ─── getStats ─────────────────────────────────────────────────

  async getStats(orgId: string) {
    const [revenue, expenses, receivables, payables, gstLiability, cashPosition] =
      await Promise.all([
        this.getRevenueStat(orgId),
        this.getExpenseStat(orgId),
        this.getReceivablesStat(orgId),
        this.getPayablesStat(orgId),
        this.getGstLiabilityStat(orgId),
        this.getCashPositionStat(orgId),
      ]);

    return { revenue, expenses, receivables, payables, gstLiability, cashPosition };
  }

  private async getRevenueStat(orgId: string) {
    const thisMonth = this.monthRange(0);
    const lastMonth = this.monthRange(1);

    const [thisMonthResult, lastMonthResult] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'sale',
          status: { in: ['sent', 'paid', 'partial'] },
          date: { gte: thisMonth.start, lte: thisMonth.end },
        },
        _sum: { amount_paid: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'sale',
          status: { in: ['sent', 'paid', 'partial'] },
          date: { gte: lastMonth.start, lte: lastMonth.end },
        },
        _sum: { amount_paid: true },
      }),
    ]);

    const thisMonthVal = this.toNumber(thisMonthResult._sum.amount_paid);
    const lastMonthVal = this.toNumber(lastMonthResult._sum.amount_paid);

    return {
      thisMonth: thisMonthVal,
      lastMonth: lastMonthVal,
      percentChange: this.percentChange(thisMonthVal, lastMonthVal),
    };
  }

  private async getExpenseStat(orgId: string) {
    const thisMonth = this.monthRange(0);
    const lastMonth = this.monthRange(1);

    const [thisMonthResult, lastMonthResult] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'purchase',
          status: { not: 'cancelled' },
          date: { gte: thisMonth.start, lte: thisMonth.end },
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'purchase',
          status: { not: 'cancelled' },
          date: { gte: lastMonth.start, lte: lastMonth.end },
        },
        _sum: { total: true },
      }),
    ]);

    const thisMonthVal = this.toNumber(thisMonthResult._sum.total);
    const lastMonthVal = this.toNumber(lastMonthResult._sum.total);

    return {
      thisMonth: thisMonthVal,
      lastMonth: lastMonthVal,
      percentChange: this.percentChange(thisMonthVal, lastMonthVal),
    };
  }

  private async getReceivablesStat(orgId: string) {
    const now = new Date();

    const [totalResult, overdueResult] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'sale',
          status: { in: ['sent', 'partial'] },
        },
        _sum: { balance_due: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'sale',
          status: { in: ['sent', 'partial'] },
          due_date: { lt: now },
        },
        _sum: { balance_due: true },
        _count: true,
      }),
    ]);

    return {
      total: this.toNumber(totalResult._sum.balance_due),
      overdue: this.toNumber(overdueResult._sum.balance_due),
      overdueCount: overdueResult._count ?? 0,
    };
  }

  private async getPayablesStat(orgId: string) {
    const now = new Date();

    const [totalResult, overdueResult] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'purchase',
          status: { in: ['sent', 'partial'] },
        },
        _sum: { balance_due: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'purchase',
          status: { in: ['sent', 'partial'] },
          due_date: { lt: now },
        },
        _sum: { balance_due: true },
        _count: true,
      }),
    ]);

    return {
      total: this.toNumber(totalResult._sum.balance_due),
      overdue: this.toNumber(overdueResult._sum.balance_due),
      overdueCount: overdueResult._count ?? 0,
    };
  }

  private async getGstLiabilityStat(orgId: string) {
    // Find the most recent un-filed GST return (GSTR-3B typically has tax liability)
    const latestReturn = await this.prisma.gstReturn.findFirst({
      where: {
        org_id: orgId,
        return_type: 'GSTR3B',
        status: { in: ['draft', 'pending'] },
      },
      orderBy: { period: 'desc' },
    });

    let currentPeriod = 0;
    let nextDueDate: string | null = null;

    if (latestReturn?.data) {
      const data = latestReturn.data as Record<string, any>;
      currentPeriod = this.toNumber(data.tax_payable ?? data.total_liability ?? 0);

      // GST due date is typically 20th of next month after the period
      // Period format is expected to be "MM-YYYY" or "MMYYYY"
      const period = latestReturn.period;
      const match = period.match(/^(\d{2})-?(\d{4})$/);
      if (match) {
        const periodMonth = parseInt(match[1], 10);
        const periodYear = parseInt(match[2], 10);
        const dueMonth = periodMonth === 12 ? 1 : periodMonth + 1;
        const dueYear = periodMonth === 12 ? periodYear + 1 : periodYear;
        nextDueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-20`;
      }
    }

    return { currentPeriod, nextDueDate };
  }

  private async getCashPositionStat(orgId: string) {
    const result = await this.prisma.bankAccount.aggregate({
      where: { org_id: orgId, is_active: true },
      _sum: { current_balance: true },
    });

    return { total: this.toNumber(result._sum.current_balance) };
  }

  // ─── getRevenueChart ──────────────────────────────────────────

  async getRevenueChart(orgId: string, months: number = 6) {
    const data: Array<{ month: string; revenue: number; expenses: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const { start, end } = this.monthRange(i);
      const monthLabel = start.toLocaleString('en-IN', { month: 'short' });

      const [revenueResult, expenseResult] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            org_id: orgId,
            type: 'sale',
            status: { in: ['sent', 'paid', 'partial'] },
            date: { gte: start, lte: end },
          },
          _sum: { total: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            org_id: orgId,
            type: 'purchase',
            status: { not: 'cancelled' },
            date: { gte: start, lte: end },
          },
          _sum: { total: true },
        }),
      ]);

      data.push({
        month: monthLabel,
        revenue: this.toNumber(revenueResult._sum.total),
        expenses: this.toNumber(expenseResult._sum.total),
      });
    }

    return data;
  }

  // ─── getCashFlowChart ─────────────────────────────────────────

  async getCashFlowChart(orgId: string, months: number = 6) {
    const data: Array<{ month: string; inflow: number; outflow: number; net: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const { start, end } = this.monthRange(i);
      const monthLabel = start.toLocaleString('en-IN', { month: 'short' });

      const [inflowResult, outflowResult] = await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            org_id: orgId,
            type: 'receive',
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            org_id: orgId,
            type: 'pay',
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
      ]);

      const inflow = this.toNumber(inflowResult._sum.amount);
      const outflow = this.toNumber(outflowResult._sum.amount);

      data.push({
        month: monthLabel,
        inflow,
        outflow,
        net: inflow - outflow,
      });
    }

    return data;
  }

  // ─── getRecentTransactions ────────────────────────────────────

  async getRecentTransactions(orgId: string, limit: number = 10) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { org_id: orgId, is_posted: true },
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        lines: {
          include: {
            account: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });

    return entries.map((entry) => {
      const totalDebit = entry.lines.reduce(
        (sum, line) => sum + this.toNumber(line.debit),
        0,
      );

      // Determine transaction type based on account types in lines
      const hasRevenueAccount = entry.lines.some((l) => l.account.type === 'income');
      const hasExpenseAccount = entry.lines.some((l) => l.account.type === 'expense');
      const type = hasRevenueAccount ? 'income' : hasExpenseAccount ? 'expense' : 'journal';

      return {
        id: entry.id,
        entryNumber: entry.entry_number,
        date: entry.date,
        narration: entry.narration,
        reference: entry.reference,
        referenceType: entry.reference_type,
        amount: totalDebit,
        type,
        lines: entry.lines.map((l) => ({
          accountName: l.account.name,
          accountType: l.account.type,
          debit: this.toNumber(l.debit),
          credit: this.toNumber(l.credit),
          description: l.description,
        })),
      };
    });
  }

  // ─── getOverdueInvoices ───────────────────────────────────────

  async getOverdueInvoices(orgId: string) {
    const now = new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'sale',
        status: { in: ['sent', 'partial'] },
        due_date: { lt: now },
      },
      orderBy: { due_date: 'asc' },
      include: {
        contact: { select: { id: true, name: true, company_name: true } },
      },
    });

    return invoices.map((inv) => {
      const dueDate = inv.due_date as Date;
      const diffMs = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        customer: inv.contact?.company_name || inv.contact?.name || 'Unknown',
        amount: this.toNumber(inv.balance_due),
        total: this.toNumber(inv.total),
        dueDate: inv.due_date,
        daysOverdue,
        status: inv.status,
      };
    });
  }

  // ─── getTopCustomers ──────────────────────────────────────────

  async getTopCustomers(orgId: string, limit: number = 5) {
    // Group paid invoices by contact to find top revenue customers
    const results = await this.prisma.invoice.groupBy({
      by: ['contact_id'],
      where: {
        org_id: orgId,
        type: 'sale',
        status: { in: ['paid', 'partial', 'sent'] },
        contact_id: { not: null },
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    // Fetch contact details
    const contactIds = results
      .map((r) => r.contact_id)
      .filter((id): id is string => id !== null);

    const contacts = await this.prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: { id: true, name: true, company_name: true },
    });

    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    return results.map((r) => {
      const contact = r.contact_id ? contactMap.get(r.contact_id) : null;
      return {
        contactId: r.contact_id,
        name: contact?.company_name || contact?.name || 'Unknown',
        revenue: this.toNumber(r._sum.total),
        invoiceCount: r._count.id,
      };
    });
  }
}
