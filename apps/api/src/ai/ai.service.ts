import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiService } from './openai.service';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Response Types ──────────────────────────────────────────────

export interface CashFlowPrediction {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface CashFlowForecast {
  predictions: CashFlowPrediction[];
  confidence: number;
  insights: string[];
  historicalMonths: number;
}

export interface CategorySuggestion {
  suggestedAccountId: string;
  suggestedAccountName: string;
  confidence: number;
  alternatives: Array<{
    accountId: string;
    accountName: string;
    confidence: number;
  }>;
}

export interface Anomaly {
  id: string;
  type: 'unusual_amount' | 'duplicate_invoice' | 'missing_sequence' | 'expense_spike';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  amount?: number;
  detectedAt: string;
}

export interface Insight {
  id: string;
  type: 'collections' | 'expenses' | 'gst' | 'overdue' | 'cash_flow' | 'general';
  severity: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  data?: Record<string, unknown>;
}

export interface ReconciliationMatch {
  journalEntryId: string;
  entryNumber: number;
  date: string;
  narration: string | null;
  amount: number;
  confidence: number;
  matchReason: string;
}

export interface AiSettings {
  cashFlowForecast: boolean;
  anomalyDetection: boolean;
  insightGeneration: boolean;
  transactionCategorization: boolean;
  reconciliationAssist: boolean;
  apiKeyConfigured: boolean;
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
  ) {}

  private toNumber(val: Decimal | number | null | undefined): number {
    if (val === null || val === undefined) return 0;
    return typeof val === 'number' ? val : Number(val);
  }

  // ─── AI Settings ──────────────────────────────────────────────

  async getSettings(orgId: string): Promise<AiSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, any>) || {};
    const aiSettings = settings.ai || {};

    return {
      cashFlowForecast: aiSettings.cashFlowForecast ?? true,
      anomalyDetection: aiSettings.anomalyDetection ?? true,
      insightGeneration: aiSettings.insightGeneration ?? true,
      transactionCategorization: aiSettings.transactionCategorization ?? true,
      reconciliationAssist: aiSettings.reconciliationAssist ?? true,
      apiKeyConfigured: this.openai.isConfigured,
    };
  }

  async updateSettings(
    orgId: string,
    data: Partial<Omit<AiSettings, 'apiKeyConfigured'>>,
  ): Promise<AiSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, any>) || {};
    const currentAi = currentSettings.ai || {};

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          ai: { ...currentAi, ...data },
        },
        updated_at: new Date(),
      },
    });

    return this.getSettings(orgId);
  }

  // ─── Cash Flow Forecast ───────────────────────────────────────

  async getCashFlowForecast(orgId: string): Promise<CashFlowForecast> {
    // Gather 12 months of historical payment data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [inflows, outflows, bankBalance] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          org_id: orgId,
          type: { in: ['received', 'receive'] },
          date: { gte: twelveMonthsAgo },
        },
        select: { amount: true, date: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: {
          org_id: orgId,
          type: { in: ['paid', 'pay'] },
          date: { gte: twelveMonthsAgo },
        },
        select: { amount: true, date: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.bankAccount.aggregate({
        where: { org_id: orgId, is_active: true },
        _sum: { current_balance: true },
      }),
    ]);

    // Aggregate by month
    const monthlyData = this.aggregateByMonth(inflows, outflows);
    const currentBalance = this.toNumber(bankBalance._sum.current_balance);

    // If OpenAI is not configured, use simple statistical projection
    if (!this.openai.isConfigured) {
      return this.statisticalForecast(monthlyData, currentBalance);
    }

    // Use AI for smarter forecasting
    try {
      const aiResult = await this.openai.analyzeFinancialData<{
        predictions: CashFlowPrediction[];
        confidence: number;
        insights: string[];
      }>(
        `Analyze the following monthly cash flow data for an Indian business and predict cash flow for the next 90 days (30/60/90 day intervals).
Current bank balance: ${currentBalance} INR.
Return a JSON object with:
- predictions: array of { date (YYYY-MM-DD), inflow, outflow, balance } for ~90 days forward, at weekly intervals
- confidence: 0-1 score
- insights: array of 2-4 actionable insight strings about cash flow trends`,
        { monthlyData, currentBalance },
      );

      return {
        ...aiResult,
        historicalMonths: monthlyData.length,
      };
    } catch (error) {
      this.logger.warn('AI forecast failed, falling back to statistical', error);
      return this.statisticalForecast(monthlyData, currentBalance);
    }
  }

  private aggregateByMonth(
    inflows: Array<{ amount: Decimal; date: Date }>,
    outflows: Array<{ amount: Decimal; date: Date }>,
  ) {
    const monthMap = new Map<
      string,
      { month: string; inflow: number; outflow: number }
    >();

    for (const payment of inflows) {
      const key = `${payment.date.getFullYear()}-${String(payment.date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key) || { month: key, inflow: 0, outflow: 0 };
      existing.inflow += this.toNumber(payment.amount);
      monthMap.set(key, existing);
    }

    for (const payment of outflows) {
      const key = `${payment.date.getFullYear()}-${String(payment.date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key) || { month: key, inflow: 0, outflow: 0 };
      existing.outflow += this.toNumber(payment.amount);
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }

  private statisticalForecast(
    monthlyData: Array<{ month: string; inflow: number; outflow: number }>,
    currentBalance: number,
  ): CashFlowForecast {
    const recentMonths = monthlyData.slice(-6);
    const avgInflow =
      recentMonths.length > 0
        ? recentMonths.reduce((s, m) => s + m.inflow, 0) / recentMonths.length
        : 0;
    const avgOutflow =
      recentMonths.length > 0
        ? recentMonths.reduce((s, m) => s + m.outflow, 0) / recentMonths.length
        : 0;

    const weeklyInflow = avgInflow / 4;
    const weeklyOutflow = avgOutflow / 4;

    const predictions: CashFlowPrediction[] = [];
    let runningBalance = currentBalance;
    const now = new Date();

    for (let week = 1; week <= 13; week++) {
      const date = new Date(now);
      date.setDate(date.getDate() + week * 7);

      runningBalance += weeklyInflow - weeklyOutflow;

      predictions.push({
        date: date.toISOString().split('T')[0],
        inflow: Math.round(weeklyInflow),
        outflow: Math.round(weeklyOutflow),
        balance: Math.round(runningBalance),
      });
    }

    const insights: string[] = [];
    if (avgInflow > avgOutflow * 1.2) {
      insights.push('Cash flow is healthy with inflows exceeding outflows by 20%+');
    } else if (avgOutflow > avgInflow) {
      insights.push(
        'Cash outflows exceed inflows — consider reviewing expenses or accelerating collections',
      );
    }
    if (recentMonths.length < 3) {
      insights.push(
        'Limited historical data available. Predictions will improve with more transaction history.',
      );
    }

    return {
      predictions,
      confidence: recentMonths.length >= 6 ? 0.6 : 0.3,
      insights,
      historicalMonths: monthlyData.length,
    };
  }

  // ─── Transaction Categorization ───────────────────────────────

  async categorizeTransaction(
    description: string,
    amount: number,
    orgId: string,
  ): Promise<CategorySuggestion> {
    // Fetch the org's chart of accounts
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, is_active: true },
      select: { id: true, name: true, type: true, sub_type: true, code: true },
      orderBy: { name: 'asc' },
    });

    if (!this.openai.isConfigured) {
      return this.heuristicCategorize(description, amount, accounts);
    }

    try {
      const accountList = accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        subType: a.sub_type,
        code: a.code,
      }));

      const result = await this.openai.analyzeFinancialData<{
        suggestedAccountId: string;
        confidence: number;
        alternatives: Array<{ accountId: string; confidence: number }>;
      }>(
        `Given this bank transaction, suggest the most appropriate account from the chart of accounts.
Transaction description: "${description}"
Transaction amount: ${amount} INR

Return JSON with:
- suggestedAccountId: the best matching account ID
- confidence: 0-1 score
- alternatives: array of up to 3 alternative { accountId, confidence }`,
        { accounts: accountList },
      );

      const suggestedAccount = accounts.find(
        (a) => a.id === result.suggestedAccountId,
      );

      return {
        suggestedAccountId: result.suggestedAccountId,
        suggestedAccountName: suggestedAccount?.name || 'Unknown',
        confidence: result.confidence,
        alternatives: result.alternatives.map((alt) => {
          const acc = accounts.find((a) => a.id === alt.accountId);
          return {
            accountId: alt.accountId,
            accountName: acc?.name || 'Unknown',
            confidence: alt.confidence,
          };
        }),
      };
    } catch (error) {
      this.logger.warn('AI categorization failed, using heuristics', error);
      return this.heuristicCategorize(description, amount, accounts);
    }
  }

  private heuristicCategorize(
    description: string,
    _amount: number,
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      sub_type: string | null;
    }>,
  ): CategorySuggestion {
    const desc = description.toLowerCase();
    const keywords: Record<string, string[]> = {
      expense: [
        'rent',
        'salary',
        'utilities',
        'electricity',
        'internet',
        'phone',
        'insurance',
        'travel',
        'food',
        'office',
        'maintenance',
      ],
      income: [
        'payment received',
        'sales',
        'revenue',
        'commission',
        'interest',
        'refund',
      ],
      bank: ['transfer', 'neft', 'rtgs', 'imps', 'upi', 'cheque'],
    };

    let matchedType = 'expense';
    for (const [type, words] of Object.entries(keywords)) {
      if (words.some((w) => desc.includes(w))) {
        matchedType = type;
        break;
      }
    }

    const typeAccounts = accounts.filter((a) => a.type === matchedType);
    const fallbackAccounts = accounts.filter((a) => a.type === 'expense');
    const candidates = typeAccounts.length > 0 ? typeAccounts : fallbackAccounts;

    if (candidates.length === 0) {
      return {
        suggestedAccountId: accounts[0]?.id || '',
        suggestedAccountName: accounts[0]?.name || 'Unknown',
        confidence: 0.1,
        alternatives: [],
      };
    }

    return {
      suggestedAccountId: candidates[0].id,
      suggestedAccountName: candidates[0].name,
      confidence: 0.4,
      alternatives: candidates.slice(1, 4).map((a) => ({
        accountId: a.id,
        accountName: a.name,
        confidence: 0.2,
      })),
    };
  }

  // ─── Anomaly Detection ────────────────────────────────────────

  async detectAnomalies(orgId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // 1. Unusual amounts (>2x standard deviation)
    const recentPayments = await this.prisma.payment.findMany({
      where: { org_id: orgId, date: { gte: threeMonthsAgo } },
      select: { id: true, amount: true, date: true, type: true, reference: true },
      orderBy: { date: 'desc' },
    });

    if (recentPayments.length >= 5) {
      const amounts = recentPayments.map((p) => this.toNumber(p.amount));
      const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const variance =
        amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const threshold = mean + 2 * stdDev;

      for (const payment of recentPayments) {
        const amount = this.toNumber(payment.amount);
        if (amount > threshold && stdDev > 0) {
          anomalies.push({
            id: `unusual-${payment.id}`,
            type: 'unusual_amount',
            severity: amount > mean + 3 * stdDev ? 'high' : 'medium',
            title: `Unusually large ${payment.type === 'pay' ? 'payment' : 'receipt'}`,
            description: `Amount of ${amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} is ${((amount - mean) / stdDev).toFixed(1)}x standard deviations above average`,
            entityId: payment.id,
            entityType: 'payment',
            amount,
            detectedAt: now.toISOString(),
          });
        }
      }
    }

    // 2. Duplicate invoices (same amount + customer within 7 days)
    const recentInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        status: { not: 'cancelled' },
        date: { gte: threeMonthsAgo },
      },
      select: {
        id: true,
        invoice_number: true,
        total: true,
        contact_id: true,
        date: true,
        type: true,
      },
      orderBy: { date: 'desc' },
    });

    const invoiceMap = new Map<
      string,
      Array<{ id: string; invoice_number: string; date: Date }>
    >();

    for (const inv of recentInvoices) {
      const key = `${inv.contact_id}-${this.toNumber(inv.total)}`;
      const existing = invoiceMap.get(key) || [];
      existing.push({ id: inv.id, invoice_number: inv.invoice_number, date: inv.date });
      invoiceMap.set(key, existing);
    }

    for (const [, group] of invoiceMap) {
      if (group.length < 2) continue;

      for (let i = 0; i < group.length - 1; i++) {
        const diffDays = Math.abs(
          (group[i].date.getTime() - group[i + 1].date.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (diffDays <= 7) {
          anomalies.push({
            id: `duplicate-${group[i].id}`,
            type: 'duplicate_invoice',
            severity: 'high',
            title: 'Potential duplicate invoice',
            description: `Invoice ${group[i].invoice_number} and ${group[i + 1].invoice_number} have the same amount and customer within ${Math.round(diffDays)} days`,
            entityId: group[i].id,
            entityType: 'invoice',
            detectedAt: now.toISOString(),
          });
          break; // One alert per group
        }
      }
    }

    // 3. Missing sequential invoice numbers
    const saleInvoices = recentInvoices
      .filter((i) => i.type === 'sale')
      .map((i) => i.invoice_number)
      .sort();

    if (saleInvoices.length >= 2) {
      // Extract numeric parts
      const numbers = saleInvoices
        .map((num) => {
          const match = num.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);

      const gaps: number[] = [];
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] - numbers[i - 1] > 1) {
          for (let j = numbers[i - 1] + 1; j < numbers[i]; j++) {
            gaps.push(j);
          }
        }
      }

      if (gaps.length > 0) {
        anomalies.push({
          id: `missing-seq-${gaps[0]}`,
          type: 'missing_sequence',
          severity: 'medium',
          title: 'Missing invoice numbers detected',
          description: `${gaps.length} invoice number(s) missing in sequence: ${gaps.slice(0, 5).join(', ')}${gaps.length > 5 ? '...' : ''}`,
          detectedAt: now.toISOString(),
        });
      }
    }

    // 4. Sudden expense spikes (month-over-month comparison)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyExpenses = await this.prisma.invoice.groupBy({
      by: ['date'],
      where: {
        org_id: orgId,
        type: 'purchase',
        status: { not: 'cancelled' },
        date: { gte: sixMonthsAgo },
      },
      _sum: { total: true },
    });

    // Re-aggregate by month
    const expenseByMonth = new Map<string, number>();
    for (const entry of monthlyExpenses) {
      const key = `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, '0')}`;
      expenseByMonth.set(
        key,
        (expenseByMonth.get(key) || 0) + this.toNumber(entry._sum.total),
      );
    }

    const sortedMonths = Array.from(expenseByMonth.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    if (sortedMonths.length >= 2) {
      const lastMonth = sortedMonths[sortedMonths.length - 1];
      const prevMonth = sortedMonths[sortedMonths.length - 2];

      if (prevMonth[1] > 0 && lastMonth[1] > prevMonth[1] * 1.5) {
        const increase = Math.round(
          ((lastMonth[1] - prevMonth[1]) / prevMonth[1]) * 100,
        );
        anomalies.push({
          id: `expense-spike-${lastMonth[0]}`,
          type: 'expense_spike',
          severity: increase > 100 ? 'high' : 'medium',
          title: 'Sudden expense spike detected',
          description: `Expenses in ${lastMonth[0]} increased by ${increase}% compared to the previous month`,
          amount: lastMonth[1],
          detectedAt: now.toISOString(),
        });
      }
    }

    // Persist anomalies as AiInsight records
    await this.persistAnomaliesAsInsights(orgId, anomalies);

    return anomalies;
  }

  private async persistAnomaliesAsInsights(
    orgId: string,
    anomalies: Anomaly[],
  ) {
    if (anomalies.length === 0) return;

    // Only create insights for anomalies not already persisted today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.aiInsight.findMany({
      where: {
        org_id: orgId,
        type: { startsWith: 'anomaly_' },
        created_at: { gte: today },
      },
      select: { title: true },
    });

    const existingTitles = new Set(existing.map((e) => e.title));

    const newInsights = anomalies
      .filter((a) => !existingTitles.has(a.title))
      .map((anomaly) => ({
        org_id: orgId,
        type: `anomaly_${anomaly.type}`,
        title: anomaly.title,
        description: anomaly.description,
        severity: anomaly.severity === 'high' ? 'danger' : anomaly.severity === 'medium' ? 'warning' : 'info',
        data: {
          entityId: anomaly.entityId,
          entityType: anomaly.entityType,
          amount: anomaly.amount,
        },
      }));

    if (newInsights.length > 0) {
      await this.prisma.aiInsight.createMany({ data: newInsights });
    }
  }

  // ─── Business Insights ────────────────────────────────────────

  async generateInsights(orgId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Collections trend
    const [thisMonthCollections, lastMonthCollections] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          org_id: orgId,
          type: { in: ['received', 'receive'] },
          date: { gte: thisMonthStart },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          org_id: orgId,
          type: { in: ['received', 'receive'] },
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const thisCollections = this.toNumber(thisMonthCollections._sum.amount);
    const lastCollections = this.toNumber(lastMonthCollections._sum.amount);

    if (lastCollections > 0) {
      const change = Math.round(
        ((thisCollections - lastCollections) / lastCollections) * 100,
      );
      insights.push({
        id: 'collections-trend',
        type: 'collections',
        severity: change >= 0 ? 'success' : 'warning',
        title:
          change >= 0
            ? `Collections up ${change}% this month`
            : `Collections down ${Math.abs(change)}% this month`,
        description: `Collected ${thisCollections.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} so far vs ${lastCollections.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} last month`,
        actionLabel: 'View Payments',
        actionHref: '/payments',
      });
    }

    // 2. Overdue summary
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'sale',
        status: { in: ['sent', 'partially_paid'] },
        due_date: { lt: now },
      },
      select: { balance_due: true, due_date: true },
    });

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce(
        (sum, inv) => sum + this.toNumber(inv.balance_due),
        0,
      );
      const maxDaysOverdue = Math.max(
        ...overdueInvoices.map((inv) =>
          Math.floor(
            (now.getTime() - (inv.due_date as Date).getTime()) / (1000 * 60 * 60 * 24),
          ),
        ),
      );

      insights.push({
        id: 'overdue-summary',
        type: 'overdue',
        severity: maxDaysOverdue > 30 ? 'danger' : 'warning',
        title: `${overdueInvoices.length} overdue invoices totaling ${totalOverdue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`,
        description: `Oldest overdue invoice is ${maxDaysOverdue} days past due. Consider sending reminders.`,
        actionLabel: 'View Overdue',
        actionHref: '/invoices?status=overdue',
      });
    }

    // 3. Expense pattern analysis
    const [thisMonthExpenses, lastMonthExpenses] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'purchase',
          status: { not: 'cancelled' },
          date: { gte: thisMonthStart },
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          org_id: orgId,
          type: 'purchase',
          status: { not: 'cancelled' },
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { total: true },
      }),
    ]);

    const thisExp = this.toNumber(thisMonthExpenses._sum.total);
    const lastExp = this.toNumber(lastMonthExpenses._sum.total);

    if (lastExp > 0 && thisExp > lastExp * 1.3) {
      const increase = Math.round(((thisExp - lastExp) / lastExp) * 100);
      insights.push({
        id: 'expense-trend',
        type: 'expenses',
        severity: 'warning',
        title: `Expenses up ${increase}% this month`,
        description: `Current month expenses are ${thisExp.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} compared to ${lastExp.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} last month`,
        actionLabel: 'Review Expenses',
        actionHref: '/purchases',
      });
    }

    // 4. GST deadline reminder
    const currentMonth = now.getMonth() + 1;
    const gstDueDay = 20;
    const daysUntilGst = gstDueDay - now.getDate();

    if (daysUntilGst > 0 && daysUntilGst <= 10) {
      insights.push({
        id: 'gst-deadline',
        type: 'gst',
        severity: daysUntilGst <= 3 ? 'danger' : 'warning',
        title: `GST filing due in ${daysUntilGst} days`,
        description: `GSTR-3B for the previous period is due on the 20th. Ensure all transactions are recorded.`,
        actionLabel: 'GST Returns',
        actionHref: '/tax/gst',
      });
    }

    // 5. Cash flow health
    const bankBalance = await this.prisma.bankAccount.aggregate({
      where: { org_id: orgId, is_active: true },
      _sum: { current_balance: true },
    });

    const balance = this.toNumber(bankBalance._sum.current_balance);
    const avgMonthlyOutflow =
      lastExp > 0 ? lastExp : thisExp;

    if (avgMonthlyOutflow > 0 && balance < avgMonthlyOutflow * 2) {
      const monthsOfRunway = balance / avgMonthlyOutflow;
      insights.push({
        id: 'cash-runway',
        type: 'cash_flow',
        severity: monthsOfRunway < 1 ? 'danger' : 'warning',
        title: `Cash runway: ~${monthsOfRunway.toFixed(1)} months`,
        description: `Current bank balance covers approximately ${monthsOfRunway.toFixed(1)} months of expenses at the current rate`,
        actionLabel: 'View Cash Flow',
        actionHref: '/insights',
      });
    }

    // If OpenAI is configured, enrich with AI-generated insight
    if (this.openai.isConfigured && insights.length > 0) {
      try {
        const aiInsight = await this.openai.analyzeFinancialData<{
          additionalInsight: { title: string; description: string; severity: string };
        }>(
          `Given these financial insights about an Indian business, provide one additional actionable recommendation not already covered.
Return JSON with: { additionalInsight: { title, description, severity: "info"|"warning"|"success" } }`,
          {
            existingInsights: insights.map((i) => ({
              title: i.title,
              description: i.description,
            })),
          },
        );

        if (aiInsight.additionalInsight) {
          insights.push({
            id: 'ai-recommendation',
            type: 'general',
            severity: (aiInsight.additionalInsight.severity as Insight['severity']) || 'info',
            title: aiInsight.additionalInsight.title,
            description: aiInsight.additionalInsight.description,
          });
        }
      } catch {
        // Silently skip AI enrichment
      }
    }

    // Persist insights
    await this.persistInsights(orgId, insights);

    return insights;
  }

  private async persistInsights(orgId: string, insights: Insight[]) {
    if (insights.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Clear today's non-anomaly insights and recreate
    await this.prisma.aiInsight.deleteMany({
      where: {
        org_id: orgId,
        type: { not: { startsWith: 'anomaly_' } },
        created_at: { gte: today },
      },
    });

    await this.prisma.aiInsight.createMany({
      data: insights.map((insight) => ({
        org_id: orgId,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity,
        data: {
          actionLabel: insight.actionLabel,
          actionHref: insight.actionHref,
          ...(insight.data || {}),
        },
      })),
    });
  }

  // ─── Reconciliation Suggestions ───────────────────────────────

  async suggestReconciliationMatch(
    transactionId: string,
    orgId: string,
  ): Promise<ReconciliationMatch[]> {
    const transaction = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, org_id: orgId },
    });

    if (!transaction) {
      return [];
    }

    const amount = this.toNumber(transaction.amount);
    const txDate = transaction.date;

    // Window: +/- 7 days, amount within 5% tolerance
    const dateFrom = new Date(txDate);
    dateFrom.setDate(dateFrom.getDate() - 7);
    const dateTo = new Date(txDate);
    dateTo.setDate(dateTo.getDate() + 7);

    const tolerance = amount * 0.05;

    // Find matching journal entries
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        org_id: orgId,
        is_posted: true,
        date: { gte: dateFrom, lte: dateTo },
        // Exclude already reconciled entries
        bank_transactions: { none: { is_reconciled: true } },
      },
      include: {
        lines: {
          include: {
            account: { select: { name: true, type: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const matches: ReconciliationMatch[] = [];

    for (const entry of entries) {
      // Calculate total debit (which represents the entry amount)
      const totalDebit = entry.lines.reduce(
        (sum, line) => sum + this.toNumber(line.debit),
        0,
      );

      const diff = Math.abs(totalDebit - Math.abs(amount));

      if (diff <= tolerance) {
        const confidence =
          diff === 0 ? 0.95 : diff <= tolerance * 0.5 ? 0.8 : 0.6;

        let matchReason = 'Amount matches';
        if (diff === 0) matchReason = 'Exact amount match';
        else if (diff <= tolerance * 0.5) matchReason = 'Close amount match';

        // Check if description/narration has matching keywords
        if (
          transaction.description &&
          entry.narration &&
          transaction.description
            .toLowerCase()
            .includes(entry.narration.toLowerCase().substring(0, 10))
        ) {
          matchReason += ' + description similarity';
        }

        matches.push({
          journalEntryId: entry.id,
          entryNumber: entry.entry_number,
          date: entry.date.toISOString().split('T')[0],
          narration: entry.narration,
          amount: totalDebit,
          confidence,
          matchReason,
        });
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    // Save suggestion to the bank transaction
    if (matches.length > 0) {
      await this.prisma.bankTransaction.update({
        where: { id: transactionId },
        data: {
          ai_suggestion: {
            topMatch: matches[0].journalEntryId,
            confidence: matches[0].confidence,
            generatedAt: new Date().toISOString(),
          },
        },
      });
    }

    return matches.slice(0, 5);
  }

  // ─── Stored Insights (for dashboard widget) ───────────────────

  async getStoredInsights(orgId: string, limit: number = 10) {
    return this.prisma.aiInsight.findMany({
      where: {
        org_id: orgId,
        is_dismissed: false,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async dismissInsight(insightId: string, orgId: string) {
    return this.prisma.aiInsight.updateMany({
      where: { id: insightId, org_id: orgId },
      data: { is_dismissed: true },
    });
  }
}
