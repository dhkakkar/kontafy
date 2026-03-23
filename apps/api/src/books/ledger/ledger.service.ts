import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LedgerEntry {
  date: Date;
  entry_number: number;
  narration: string | null;
  reference: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the ledger for a specific account, showing all journal entries
   * that affect this account, with a running balance.
   */
  async getAccountLedger(
    orgId: string,
    accountId: string,
    filters: { from?: string; to?: string; page: number; limit: number },
  ) {
    // Verify account exists and belongs to org
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const { from, to } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    // Build date filter on the parent journal_entry
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const entryDateWhere = Object.keys(dateFilter).length > 0
      ? { entry: { date: dateFilter, org_id: orgId, is_posted: true } }
      : { entry: { org_id: orgId, is_posted: true } };

    // Get opening balance (sum of all entries before the 'from' date)
    let openingBalance = account.opening_balance?.toNumber() || 0;

    if (from) {
      const priorEntries = await this.prisma.journalLine.findMany({
        where: {
          account_id: accountId,
          entry: {
            org_id: orgId,
            is_posted: true,
            date: { lt: new Date(from) },
          },
        },
        select: { debit: true, credit: true },
      });

      for (const line of priorEntries) {
        const debit = line.debit?.toNumber() || 0;
        const credit = line.credit?.toNumber() || 0;
        // For asset/expense accounts: debit increases, credit decreases
        // For liability/equity/income: credit increases, debit decreases
        if (['asset', 'expense'].includes(account.type)) {
          openingBalance += debit - credit;
        } else {
          openingBalance += credit - debit;
        }
      }
    }

    // Fetch ledger lines
    const [lines, total] = await Promise.all([
      this.prisma.journalLine.findMany({
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
        skip,
        take: limit,
      }),
      this.prisma.journalLine.count({
        where: {
          account_id: accountId,
          ...entryDateWhere,
        },
      }),
    ]);

    // Build running balance
    let balance = openingBalance;
    const ledgerEntries: LedgerEntry[] = lines.map((line) => {
      const debit = line.debit?.toNumber() || 0;
      const credit = line.credit?.toNumber() || 0;

      if (['asset', 'expense'].includes(account.type)) {
        balance += debit - credit;
      } else {
        balance += credit - debit;
      }

      return {
        date: line.entry.date,
        entry_number: line.entry.entry_number,
        narration: line.entry.narration,
        reference: line.entry.reference,
        debit,
        credit,
        running_balance: Math.round(balance * 100) / 100,
      };
    });

    return {
      data: {
        account: {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
        },
        opening_balance: openingBalance,
        closing_balance: balance,
        entries: ledgerEntries,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generate a trial balance as of a specific date.
   * Lists all accounts with their debit/credit balances.
   */
  async getTrialBalance(orgId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();

    // Get all active accounts
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, is_active: true },
      orderBy: { code: 'asc' },
    });

    // Get all posted journal lines up to asOf date
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

    // Aggregate by account
    const balances = new Map<string, { debit: number; credit: number }>();
    for (const line of journalLines) {
      const existing = balances.get(line.account_id) || { debit: 0, credit: 0 };
      existing.debit += line.debit?.toNumber() || 0;
      existing.credit += line.credit?.toNumber() || 0;
      balances.set(line.account_id, existing);
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const trialBalance = accounts.map((account) => {
      const txnBalance = balances.get(account.id) || { debit: 0, credit: 0 };
      const opening = account.opening_balance?.toNumber() || 0;

      let debitBalance = 0;
      let creditBalance = 0;

      const netDebit = txnBalance.debit - txnBalance.credit;

      if (['asset', 'expense'].includes(account.type)) {
        const total = opening + netDebit;
        if (total >= 0) {
          debitBalance = total;
        } else {
          creditBalance = Math.abs(total);
        }
      } else {
        const total = opening + (txnBalance.credit - txnBalance.debit);
        if (total >= 0) {
          creditBalance = total;
        } else {
          debitBalance = Math.abs(total);
        }
      }

      totalDebit += debitBalance;
      totalCredit += creditBalance;

      return {
        account_id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit: Math.round(debitBalance * 100) / 100,
        credit: Math.round(creditBalance * 100) / 100,
      };
    }).filter((row) => row.debit !== 0 || row.credit !== 0);

    return {
      as_of: asOfDate.toISOString().split('T')[0],
      entries: trialBalance,
      totals: {
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    };
  }
}
