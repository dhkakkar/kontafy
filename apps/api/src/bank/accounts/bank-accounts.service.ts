import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../dto/bank.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BankAccountsService {
  private readonly logger = new Logger(BankAccountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all bank accounts for an organization.
   */
  async findAll(orgId: string) {
    return this.prisma.bankAccount.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get a single bank account by ID.
   */
  async findOne(orgId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    return account;
  }

  /**
   * Create a new bank account.
   */
  async create(orgId: string, data: CreateBankAccountDto) {
    const account = await this.prisma.bankAccount.create({
      data: {
        org_id: orgId,
        account_name: data.account_name,
        bank_name: data.bank_name,
        account_number: data.account_number,
        ifsc: data.ifsc,
        account_type: data.account_type,
        opening_balance: data.opening_balance ?? 0,
        current_balance: data.opening_balance ?? 0,
        account_id: data.account_id,
        is_active: true,
      },
    });

    this.logger.log(`Bank account created: ${account.id} for org ${orgId}`);
    return account;
  }

  /**
   * Update a bank account.
   */
  async update(orgId: string, id: string, data: UpdateBankAccountDto) {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { id, org_id: orgId },
    });

    if (!existing) {
      throw new NotFoundException('Bank account not found');
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data,
    });
  }

  /**
   * Get current balance for a bank account.
   * Calculated as opening_balance + SUM(credits) - SUM(debits).
   */
  async getBalance(orgId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    const transactions = await this.prisma.bankTransaction.findMany({
      where: { bank_account_id: id, org_id: orgId },
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

    return {
      id: account.id,
      account_name: account.account_name,
      opening_balance: account.opening_balance,
      current_balance: balance,
      transaction_count: transactions.length,
    };
  }
}
