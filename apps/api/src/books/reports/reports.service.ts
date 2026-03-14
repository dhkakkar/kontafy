import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AccountBalance {
  account_id: string;
  code: string | null;
  name: string;
  type: string;
  sub_type: string | null;
  debit: number;
  credit: number;
  balance: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helper: get account balances as of a date ────────────────────

  private async getAccountBalances(
    orgId: string,
    asOfDate: Date,
  ): Promise<AccountBalance[]> {
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, is_active: true },
      orderBy: { code: 'asc' },
    });

    const journalLines = await this.prisma.journalLine.findMany({
      where: {
        entry: {
          org_id: orgId,
          is_posted: true,
          date: { lte: asOfDate },
        },
      },
      select: {
        account_id: true,
        debit: true,
        credit: true,
      },
    });

    const txnMap = new Map<string, { debit: number; credit: number }>();
    for (const line of journalLines) {
      const existing = txnMap.get(line.account_id) || { debit: 0, credit: 0 };
      existing.debit += line.debit?.toNumber() || 0;
      existing.credit += line.credit?.toNumber() || 0;
      txnMap.set(line.account_id, existing);
    }

    return accounts.map((account) => {
      const txn = txnMap.get(account.id) || { debit: 0, credit: 0 };
      const opening = account.opening_balance?.toNumber() || 0;
      const netDebit = txn.debit - txn.credit;

      let balance: number;
      if (['asset', 'expense'].includes(account.type)) {
        balance = opening + netDebit;
      } else {
        balance = opening + (txn.credit - txn.debit);
      }

      return {
        account_id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        sub_type: account.sub_type,
        debit: Math.round(txn.debit * 100) / 100,
        credit: Math.round(txn.credit * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      };
    });
  }

  // ─── Helper: get balances for a date RANGE (income/expense) ───────

  private async getAccountBalancesForRange(
    orgId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<AccountBalance[]> {
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, is_active: true },
      orderBy: { code: 'asc' },
    });

    const journalLines = await this.prisma.journalLine.findMany({
      where: {
        entry: {
          org_id: orgId,
          is_posted: true,
          date: { gte: fromDate, lte: toDate },
        },
      },
      select: {
        account_id: true,
        debit: true,
        credit: true,
      },
    });

    const txnMap = new Map<string, { debit: number; credit: number }>();
    for (const line of journalLines) {
      const existing = txnMap.get(line.account_id) || { debit: 0, credit: 0 };
      existing.debit += line.debit?.toNumber() || 0;
      existing.credit += line.credit?.toNumber() || 0;
      txnMap.set(line.account_id, existing);
    }

    return accounts.map((account) => {
      const txn = txnMap.get(account.id) || { debit: 0, credit: 0 };

      let balance: number;
      if (['asset', 'expense'].includes(account.type)) {
        balance = txn.debit - txn.credit;
      } else {
        balance = txn.credit - txn.debit;
      }

      return {
        account_id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        sub_type: account.sub_type,
        debit: Math.round(txn.debit * 100) / 100,
        credit: Math.round(txn.credit * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Trial Balance
  // ═══════════════════════════════════════════════════════════════════

  async getTrialBalance(orgId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const balances = await this.getAccountBalances(orgId, asOfDate);

    let totalDebit = 0;
    let totalCredit = 0;

    const entries = balances
      .map((acc) => {
        let debitBalance = 0;
        let creditBalance = 0;

        if (['asset', 'expense'].includes(acc.type)) {
          if (acc.balance >= 0) {
            debitBalance = acc.balance;
          } else {
            creditBalance = Math.abs(acc.balance);
          }
        } else {
          if (acc.balance >= 0) {
            creditBalance = acc.balance;
          } else {
            debitBalance = Math.abs(acc.balance);
          }
        }

        totalDebit += debitBalance;
        totalCredit += creditBalance;

        return {
          account_id: acc.account_id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          debit: Math.round(debitBalance * 100) / 100,
          credit: Math.round(creditBalance * 100) / 100,
        };
      })
      .filter((row) => row.debit !== 0 || row.credit !== 0);

    return {
      as_of: asOfDate.toISOString().split('T')[0],
      entries,
      totals: {
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Profit & Loss Statement
  // ═══════════════════════════════════════════════════════════════════

  async getProfitAndLoss(orgId: string, fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const balances = await this.getAccountBalancesForRange(orgId, from, to);

    // Revenue accounts
    const revenueAccounts = balances
      .filter((a) => a.type === 'income')
      .filter((a) => a.balance !== 0);

    // Expense accounts — split by sub_type
    const cogsAccounts = balances
      .filter(
        (a) =>
          a.type === 'expense' &&
          (a.sub_type === 'cost_of_goods_sold' || a.sub_type === 'cogs'),
      )
      .filter((a) => a.balance !== 0);

    const operatingExpenseAccounts = balances
      .filter(
        (a) =>
          a.type === 'expense' &&
          a.sub_type !== 'cost_of_goods_sold' &&
          a.sub_type !== 'cogs' &&
          a.sub_type !== 'other_expense',
      )
      .filter((a) => a.balance !== 0);

    const otherExpenseAccounts = balances
      .filter((a) => a.type === 'expense' && a.sub_type === 'other_expense')
      .filter((a) => a.balance !== 0);

    // If no sub_type used, treat all expenses as operating expenses
    const hasSubTypes = balances.some(
      (a) => a.type === 'expense' && a.sub_type,
    );
    const allExpenses = balances
      .filter((a) => a.type === 'expense' && a.balance !== 0);

    const totalRevenue = revenueAccounts.reduce((s, a) => s + a.balance, 0);
    const totalCogs = cogsAccounts.reduce((s, a) => s + a.balance, 0);
    const grossProfit = totalRevenue - totalCogs;

    let totalOperatingExpenses: number;
    let totalOtherExpenses: number;

    if (hasSubTypes) {
      totalOperatingExpenses = operatingExpenseAccounts.reduce(
        (s, a) => s + a.balance,
        0,
      );
      totalOtherExpenses = otherExpenseAccounts.reduce(
        (s, a) => s + a.balance,
        0,
      );
    } else {
      totalOperatingExpenses = allExpenses.reduce(
        (s, a) => s + a.balance,
        0,
      );
      totalOtherExpenses = 0;
    }

    const operatingProfit = grossProfit - totalOperatingExpenses;
    const netProfit = operatingProfit - totalOtherExpenses;

    return {
      from_date: from.toISOString().split('T')[0],
      to_date: to.toISOString().split('T')[0],
      revenue: {
        accounts: revenueAccounts.map((a) => ({
          account_id: a.account_id,
          code: a.code,
          name: a.name,
          amount: Math.round(a.balance * 100) / 100,
        })),
        total: Math.round(totalRevenue * 100) / 100,
      },
      cost_of_goods_sold: {
        accounts: (hasSubTypes ? cogsAccounts : []).map((a) => ({
          account_id: a.account_id,
          code: a.code,
          name: a.name,
          amount: Math.round(a.balance * 100) / 100,
        })),
        total: Math.round(totalCogs * 100) / 100,
      },
      gross_profit: Math.round(grossProfit * 100) / 100,
      operating_expenses: {
        accounts: (hasSubTypes ? operatingExpenseAccounts : allExpenses).map(
          (a) => ({
            account_id: a.account_id,
            code: a.code,
            name: a.name,
            amount: Math.round(a.balance * 100) / 100,
          }),
        ),
        total: Math.round(totalOperatingExpenses * 100) / 100,
      },
      operating_profit: Math.round(operatingProfit * 100) / 100,
      other_expenses: {
        accounts: otherExpenseAccounts.map((a) => ({
          account_id: a.account_id,
          code: a.code,
          name: a.name,
          amount: Math.round(a.balance * 100) / 100,
        })),
        total: Math.round(totalOtherExpenses * 100) / 100,
      },
      net_profit: Math.round(netProfit * 100) / 100,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Balance Sheet
  // ═══════════════════════════════════════════════════════════════════

  async getBalanceSheet(orgId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const balances = await this.getAccountBalances(orgId, asOfDate);

    // Categorize assets
    const currentAssets = balances.filter(
      (a) =>
        a.type === 'asset' &&
        (a.sub_type === 'current_asset' || !a.sub_type) &&
        a.sub_type !== 'fixed_asset' &&
        a.balance !== 0,
    );
    const fixedAssets = balances.filter(
      (a) => a.type === 'asset' && a.sub_type === 'fixed_asset' && a.balance !== 0,
    );
    const otherAssets = balances.filter(
      (a) =>
        a.type === 'asset' &&
        a.sub_type &&
        a.sub_type !== 'current_asset' &&
        a.sub_type !== 'fixed_asset' &&
        a.balance !== 0,
    );

    // If no sub_types, all assets go as "assets"
    const allAssets = balances.filter(
      (a) => a.type === 'asset' && a.balance !== 0,
    );
    const hasAssetSubTypes = balances.some(
      (a) => a.type === 'asset' && a.sub_type,
    );

    // Categorize liabilities
    const currentLiabilities = balances.filter(
      (a) =>
        a.type === 'liability' &&
        (a.sub_type === 'current_liability' || !a.sub_type) &&
        a.sub_type !== 'long_term_liability' &&
        a.balance !== 0,
    );
    const longTermLiabilities = balances.filter(
      (a) =>
        a.type === 'liability' &&
        a.sub_type === 'long_term_liability' &&
        a.balance !== 0,
    );
    const hasLiabilitySubTypes = balances.some(
      (a) => a.type === 'liability' && a.sub_type,
    );
    const allLiabilities = balances.filter(
      (a) => a.type === 'liability' && a.balance !== 0,
    );

    // Equity
    const equityAccounts = balances.filter(
      (a) => a.type === 'equity' && a.balance !== 0,
    );

    // Compute retained earnings (net income to date)
    // Income - Expenses accumulated to date
    const totalIncome = balances
      .filter((a) => a.type === 'income')
      .reduce((s, a) => s + a.balance, 0);
    const totalExpenses = balances
      .filter((a) => a.type === 'expense')
      .reduce((s, a) => s + a.balance, 0);
    const retainedEarnings = totalIncome - totalExpenses;

    const mapAccount = (a: AccountBalance) => ({
      account_id: a.account_id,
      code: a.code,
      name: a.name,
      amount: Math.round(a.balance * 100) / 100,
    });

    const totalAssetsValue = allAssets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilitiesValue = allLiabilities.reduce(
      (s, a) => s + a.balance,
      0,
    );
    const totalEquityValue =
      equityAccounts.reduce((s, a) => s + a.balance, 0) + retainedEarnings;

    const r = (n: number) => Math.round(n * 100) / 100;

    return {
      as_of: asOfDate.toISOString().split('T')[0],
      assets: {
        current_assets: {
          accounts: (hasAssetSubTypes ? currentAssets : allAssets).map(
            mapAccount,
          ),
          total: r(
            (hasAssetSubTypes ? currentAssets : allAssets).reduce(
              (s, a) => s + a.balance,
              0,
            ),
          ),
        },
        fixed_assets: {
          accounts: fixedAssets.map(mapAccount),
          total: r(fixedAssets.reduce((s, a) => s + a.balance, 0)),
        },
        other_assets: {
          accounts: otherAssets.map(mapAccount),
          total: r(otherAssets.reduce((s, a) => s + a.balance, 0)),
        },
        total: r(totalAssetsValue),
      },
      liabilities: {
        current_liabilities: {
          accounts: (hasLiabilitySubTypes
            ? currentLiabilities
            : allLiabilities
          ).map(mapAccount),
          total: r(
            (hasLiabilitySubTypes
              ? currentLiabilities
              : allLiabilities
            ).reduce((s, a) => s + a.balance, 0),
          ),
        },
        long_term_liabilities: {
          accounts: longTermLiabilities.map(mapAccount),
          total: r(longTermLiabilities.reduce((s, a) => s + a.balance, 0)),
        },
        total: r(totalLiabilitiesValue),
      },
      equity: {
        accounts: equityAccounts.map(mapAccount),
        retained_earnings: r(retainedEarnings),
        total: r(totalEquityValue),
      },
      total_liabilities_and_equity: r(totalLiabilitiesValue + totalEquityValue),
      is_balanced:
        Math.abs(totalAssetsValue - (totalLiabilitiesValue + totalEquityValue)) <
        0.01,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Cash Flow Statement (Indirect Method)
  // ═══════════════════════════════════════════════════════════════════

  async getCashFlow(orgId: string, fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Get P&L to determine net profit
    const pnl = await this.getProfitAndLoss(orgId, fromDate, toDate);
    const netProfit = pnl.net_profit;

    // Get balance changes for the period
    const balancesStart = await this.getAccountBalances(
      orgId,
      new Date(from.getTime() - 86400000), // day before start
    );
    const balancesEnd = await this.getAccountBalances(orgId, to);

    const startMap = new Map(balancesStart.map((a) => [a.account_id, a]));
    const endMap = new Map(balancesEnd.map((a) => [a.account_id, a]));

    // All accounts union
    const allAccountIds = new Set([
      ...balancesStart.map((a) => a.account_id),
      ...balancesEnd.map((a) => a.account_id),
    ]);

    const changes: Array<{
      account_id: string;
      code: string | null;
      name: string;
      type: string;
      sub_type: string | null;
      change: number;
    }> = [];

    for (const id of allAccountIds) {
      const startBal = startMap.get(id);
      const endBal = endMap.get(id);
      const startVal = startBal?.balance || 0;
      const endVal = endBal?.balance || 0;
      const change = endVal - startVal;

      if (Math.abs(change) > 0.01) {
        changes.push({
          account_id: id,
          code: (endBal || startBal)!.code,
          name: (endBal || startBal)!.name,
          type: (endBal || startBal)!.type,
          sub_type: (endBal || startBal)!.sub_type,
          change: Math.round(change * 100) / 100,
        });
      }
    }

    // Operating activities: changes in current assets (except cash) & current liabilities
    const nonCashAdjustments: Array<{ name: string; amount: number }> = [];
    const workingCapitalChanges: Array<{ name: string; amount: number }> = [];

    // Depreciation (sub_type check) — add back to net profit
    const depreciationAccounts = changes.filter(
      (c) =>
        c.type === 'expense' &&
        (c.sub_type === 'depreciation' ||
          c.name.toLowerCase().includes('depreciation') ||
          c.name.toLowerCase().includes('amortization')),
    );
    for (const dep of depreciationAccounts) {
      nonCashAdjustments.push({
        name: dep.name,
        amount: dep.change,
      });
    }

    // Changes in current assets (excluding cash/bank)
    const currentAssetChanges = changes.filter(
      (c) =>
        c.type === 'asset' &&
        c.sub_type !== 'fixed_asset' &&
        !c.name.toLowerCase().includes('cash') &&
        !c.name.toLowerCase().includes('bank'),
    );
    for (const ca of currentAssetChanges) {
      // Increase in asset = cash outflow (negative)
      workingCapitalChanges.push({
        name: `Change in ${ca.name}`,
        amount: -ca.change,
      });
    }

    // Changes in current liabilities
    const currentLiabilityChanges = changes.filter(
      (c) => c.type === 'liability' && c.sub_type !== 'long_term_liability',
    );
    for (const cl of currentLiabilityChanges) {
      // Increase in liability = cash inflow (positive)
      workingCapitalChanges.push({
        name: `Change in ${cl.name}`,
        amount: cl.change,
      });
    }

    const totalNonCash = nonCashAdjustments.reduce((s, a) => s + a.amount, 0);
    const totalWorkingCapital = workingCapitalChanges.reduce(
      (s, a) => s + a.amount,
      0,
    );
    const operatingCashFlow = netProfit + totalNonCash + totalWorkingCapital;

    // Investing activities: changes in fixed assets
    const investingItems: Array<{ name: string; amount: number }> = [];
    const fixedAssetChanges = changes.filter(
      (c) => c.type === 'asset' && c.sub_type === 'fixed_asset',
    );
    for (const fa of fixedAssetChanges) {
      investingItems.push({
        name:
          fa.change > 0
            ? `Purchase of ${fa.name}`
            : `Sale of ${fa.name}`,
        amount: -fa.change,
      });
    }
    const investingCashFlow = investingItems.reduce(
      (s, a) => s + a.amount,
      0,
    );

    // Financing activities: changes in equity & long-term liabilities
    const financingItems: Array<{ name: string; amount: number }> = [];
    const equityChanges = changes.filter((c) => c.type === 'equity');
    for (const eq of equityChanges) {
      financingItems.push({
        name: `Change in ${eq.name}`,
        amount: eq.change,
      });
    }
    const longTermLiabilityChanges = changes.filter(
      (c) => c.type === 'liability' && c.sub_type === 'long_term_liability',
    );
    for (const lt of longTermLiabilityChanges) {
      financingItems.push({
        name: `Change in ${lt.name}`,
        amount: lt.change,
      });
    }
    const financingCashFlow = financingItems.reduce(
      (s, a) => s + a.amount,
      0,
    );

    const netCashChange = operatingCashFlow + investingCashFlow + financingCashFlow;

    // Opening & closing cash
    const cashAccountsStart = balancesStart.filter(
      (a) =>
        a.type === 'asset' &&
        (a.name.toLowerCase().includes('cash') ||
          a.name.toLowerCase().includes('bank')),
    );
    const cashAccountsEnd = balancesEnd.filter(
      (a) =>
        a.type === 'asset' &&
        (a.name.toLowerCase().includes('cash') ||
          a.name.toLowerCase().includes('bank')),
    );

    const openingCash = cashAccountsStart.reduce(
      (s, a) => s + a.balance,
      0,
    );
    const closingCash = cashAccountsEnd.reduce((s, a) => s + a.balance, 0);

    const r = (n: number) => Math.round(n * 100) / 100;

    return {
      from_date: from.toISOString().split('T')[0],
      to_date: to.toISOString().split('T')[0],
      operating_activities: {
        net_profit: r(netProfit),
        non_cash_adjustments: nonCashAdjustments.map((a) => ({
          ...a,
          amount: r(a.amount),
        })),
        working_capital_changes: workingCapitalChanges.map((a) => ({
          ...a,
          amount: r(a.amount),
        })),
        total: r(operatingCashFlow),
      },
      investing_activities: {
        items: investingItems.map((a) => ({ ...a, amount: r(a.amount) })),
        total: r(investingCashFlow),
      },
      financing_activities: {
        items: financingItems.map((a) => ({ ...a, amount: r(a.amount) })),
        total: r(financingCashFlow),
      },
      net_change_in_cash: r(netCashChange),
      opening_cash: r(openingCash),
      closing_cash: r(closingCash),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Day Book
  // ═══════════════════════════════════════════════════════════════════

  async getDayBook(orgId: string, date: string) {
    const targetDate = new Date(date);

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        org_id: orgId,
        is_posted: true,
        date: targetDate,
      },
      include: {
        lines: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { entry_number: 'asc' },
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const dayBookEntries = entries.map((entry) => {
      const lines = entry.lines.map((line) => {
        const debit = line.debit?.toNumber() || 0;
        const credit = line.credit?.toNumber() || 0;
        totalDebit += debit;
        totalCredit += credit;

        return {
          account_id: line.account.id,
          account_code: line.account.code,
          account_name: line.account.name,
          account_type: line.account.type,
          description: line.description,
          debit: Math.round(debit * 100) / 100,
          credit: Math.round(credit * 100) / 100,
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
      date: targetDate.toISOString().split('T')[0],
      entries: dayBookEntries,
      totals: {
        entries_count: entries.length,
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // General Ledger (detailed for one account)
  // ═══════════════════════════════════════════════════════════════════

  async getGeneralLedger(
    orgId: string,
    accountId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    // Opening balance
    let openingBalance = account.opening_balance?.toNumber() || 0;

    if (from) {
      const priorLines = await this.prisma.journalLine.findMany({
        where: {
          account_id: accountId,
          entry: {
            org_id: orgId,
            is_posted: true,
            date: { lt: from },
          },
        },
        select: { debit: true, credit: true },
      });

      for (const line of priorLines) {
        const debit = line.debit?.toNumber() || 0;
        const credit = line.credit?.toNumber() || 0;
        if (['asset', 'expense'].includes(account.type)) {
          openingBalance += debit - credit;
        } else {
          openingBalance += credit - debit;
        }
      }
    }

    // Build date filter
    const dateFilter: any = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;

    const entryDateWhere =
      Object.keys(dateFilter).length > 0
        ? { entry: { date: dateFilter, org_id: orgId, is_posted: true } }
        : { entry: { org_id: orgId, is_posted: true } };

    const lines = await this.prisma.journalLine.findMany({
      where: {
        account_id: accountId,
        ...entryDateWhere,
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
      orderBy: {
        entry: { date: 'asc' },
      },
    });

    let runningBalance = openingBalance;
    const transactions = lines.map((line) => {
      const debit = line.debit?.toNumber() || 0;
      const credit = line.credit?.toNumber() || 0;

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
        debit: Math.round(debit * 100) / 100,
        credit: Math.round(credit * 100) / 100,
        balance: Math.round(runningBalance * 100) / 100,
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        sub_type: account.sub_type,
      },
      from_date: from?.toISOString().split('T')[0] || null,
      to_date: to?.toISOString().split('T')[0] || null,
      opening_balance: Math.round(openingBalance * 100) / 100,
      transactions,
      closing_balance: Math.round(runningBalance * 100) / 100,
      total_debit: Math.round(
        transactions.reduce((s, t) => s + t.debit, 0) * 100,
      ) / 100,
      total_credit: Math.round(
        transactions.reduce((s, t) => s + t.credit, 0) * 100,
      ) / 100,
    };
  }
}
