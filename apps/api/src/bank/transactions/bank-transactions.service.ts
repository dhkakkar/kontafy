import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankTransactionDto, ReconcileTransactionDto } from '../dto/bank.dto';

@Injectable()
export class BankTransactionsService {
  private readonly logger = new Logger(BankTransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List transactions with optional filters.
   */
  async findAll(
    orgId: string,
    filters?: {
      bank_account_id?: string;
      from?: string;
      to?: string;
      is_reconciled?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = { org_id: orgId };
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 50;

    if (filters?.bank_account_id) {
      where.bank_account_id = filters.bank_account_id;
    }
    if (filters?.is_reconciled !== undefined) {
      where.is_reconciled = filters.is_reconciled === 'true';
    }
    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bank_account: {
            select: { account_name: true, bank_name: true },
          },
        },
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a manual bank transaction.
   */
  async create(orgId: string, data: CreateBankTransactionDto) {
    // Verify bank account belongs to org
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: data.bank_account_id, org_id: orgId },
    });
    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    const transaction = await this.prisma.bankTransaction.create({
      data: {
        org_id: orgId,
        bank_account_id: data.bank_account_id,
        date: new Date(data.date),
        description: data.description,
        reference: data.reference,
        amount: data.amount,
        type: data.type,
        source: 'manual',
        is_reconciled: false,
      },
    });

    // Update current_balance on bank account
    await this.recalculateBalance(orgId, data.bank_account_id);

    return transaction;
  }

  /**
   * Bulk import transactions from parsed CSV rows.
   * Expected CSV columns: Date, Description, Debit, Credit, Balance
   */
  async importFromCsv(
    orgId: string,
    bankAccountId: string,
    rows: Array<{
      date: string;
      description?: string;
      debit?: number;
      credit?: number;
      balance?: number;
      reference?: string;
    }>,
  ) {
    // Verify bank account
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, org_id: orgId },
    });
    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (!rows || rows.length === 0) {
      throw new BadRequestException('No transaction rows provided');
    }

    const transactions = rows.map((row) => {
      const isDebit = (row.debit ?? 0) > 0;
      const amount = isDebit ? row.debit! : (row.credit ?? 0);

      if (amount <= 0) {
        throw new BadRequestException(
          `Invalid amount in row: ${row.description || row.date}. Either debit or credit must be positive.`,
        );
      }

      return {
        org_id: orgId,
        bank_account_id: bankAccountId,
        date: new Date(row.date),
        description: row.description || null,
        reference: row.reference || null,
        amount,
        type: isDebit ? 'debit' : 'credit',
        balance: row.balance ?? null,
        source: 'import',
        is_reconciled: false,
      };
    });

    const result = await this.prisma.bankTransaction.createMany({
      data: transactions,
    });

    // Recalculate balance
    await this.recalculateBalance(orgId, bankAccountId);

    this.logger.log(
      `Imported ${result.count} transactions for bank account ${bankAccountId}`,
    );

    return {
      imported: result.count,
      bank_account_id: bankAccountId,
    };
  }

  /**
   * Get unreconciled transactions for an org/account.
   */
  async getUnreconciled(orgId: string, bankAccountId?: string) {
    const where: any = {
      org_id: orgId,
      is_reconciled: false,
    };
    if (bankAccountId) {
      where.bank_account_id = bankAccountId;
    }

    return this.prisma.bankTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        bank_account: {
          select: { account_name: true, bank_name: true },
        },
      },
    });
  }

  /**
   * Mark a transaction as reconciled, linking it to a journal entry.
   */
  async reconcile(orgId: string, id: string, data: ReconcileTransactionDto) {
    const transaction = await this.prisma.bankTransaction.findFirst({
      where: { id, org_id: orgId },
    });

    if (!transaction) {
      throw new NotFoundException('Bank transaction not found');
    }

    if (transaction.is_reconciled) {
      throw new BadRequestException('Transaction is already reconciled');
    }

    // If matching to a journal entry directly
    const updateData: any = {
      is_reconciled: true,
    };

    if (data.matched_entry_id) {
      // Verify journal entry exists
      const entry = await this.prisma.journalEntry.findFirst({
        where: { id: data.matched_entry_id, org_id: orgId },
      });
      if (!entry) {
        throw new NotFoundException('Journal entry not found');
      }
      updateData.matched_entry_id = data.matched_entry_id;
    }

    // If matching to a payment
    if (data.payment_id) {
      const payment = await this.prisma.payment.findFirst({
        where: { id: data.payment_id, org_id: orgId },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }
      // Link via the payment's journal entry if available
      if (payment.journal_id) {
        updateData.matched_entry_id = payment.journal_id;
      }
    }

    // If matching to an invoice
    if (data.invoice_id) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: data.invoice_id, org_id: orgId },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.journal_id) {
        updateData.matched_entry_id = invoice.journal_id;
      }
    }

    const updated = await this.prisma.bankTransaction.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Transaction ${id} reconciled`);
    return updated;
  }

  /**
   * Recalculate and update the current_balance on a bank account.
   */
  private async recalculateBalance(orgId: string, bankAccountId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, org_id: orgId },
    });
    if (!account) return;

    const transactions = await this.prisma.bankTransaction.findMany({
      where: { bank_account_id: bankAccountId, org_id: orgId },
      select: { amount: true, type: true },
    });

    let balance = Number(account.opening_balance);
    for (const txn of transactions) {
      const amt = Number(txn.amount);
      if (txn.type === 'credit') {
        balance += amt;
      } else {
        balance -= amt;
      }
    }

    await this.prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { current_balance: balance },
    });
  }
}
