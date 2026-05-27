import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all accounts for an organization, optionally filtered.
   */
  async findAll(orgId: string, filters?: { type?: string; activeOnly?: boolean }) {
    const where: any = { org_id: orgId };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.activeOnly) {
      where.is_active = true;
    }

    const accounts = await this.prisma.account.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });

    return accounts;
  }

  /**
   * Get a single account by ID.
   */
  async findOne(orgId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  /**
   * Create a new account in the chart of accounts.
   */
  async create(
    orgId: string,
    data: {
      code: string;
      name: string;
      type: string;
      sub_type?: string;
      parent_id?: string;
      opening_balance?: number;
      description?: string;
    },
  ) {
    // The GlobalExceptionFilter maps HttpException payloads into
    // { code: resp.error, message: resp.message, details: resp.details }.
    // So to surface a field-level error to the client we set `error` (the
    // machine code), `message` (human text), and `details: { field }`. The
    // frontend reads `details.field` to render inline errors on the right
    // input — without this, the modal had no way to tell which field was
    // bad and the whole thing looked like a silent save failure.

    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException({
        error: 'INVALID_TYPE',
        message: `Invalid account type. Must be one of: ${validTypes.join(', ')}`,
        details: { field: 'type' },
      });
    }

    const code = (data.code || '').trim();
    const name = (data.name || '').trim();
    if (!code) {
      throw new BadRequestException({
        error: 'REQUIRED',
        message: 'Account code is required',
        details: { field: 'code' },
      });
    }
    if (!name) {
      throw new BadRequestException({
        error: 'REQUIRED',
        message: 'Account name is required',
        details: { field: 'name' },
      });
    }

    const existingByCode = await this.prisma.account.findFirst({
      where: { org_id: orgId, code },
      select: { id: true, code: true, name: true },
    });
    if (existingByCode) {
      throw new ConflictException({
        error: 'DUPLICATE_CODE',
        message: `Code ${code} is already used by "${existingByCode.name}". Try a different code.`,
        details: {
          field: 'code',
          existing: { code: existingByCode.code, name: existingByCode.name },
        },
      });
    }

    // Case-insensitive name uniqueness. Without this, two ledgers with
    // identical display names (e.g. "Bank Charges" twice with different
    // codes) can both exist and confuse every ledger picker downstream.
    const existingByName = await this.prisma.account.findFirst({
      where: {
        org_id: orgId,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true, code: true, name: true },
    });
    if (existingByName) {
      throw new ConflictException({
        error: 'DUPLICATE_NAME',
        message: `An account named "${existingByName.name}" already exists (code ${existingByName.code}).`,
        details: {
          field: 'name',
          existing: { code: existingByName.code, name: existingByName.name },
        },
      });
    }

    if (data.parent_id) {
      const parent = await this.prisma.account.findFirst({
        where: { id: data.parent_id, org_id: orgId },
      });
      if (!parent) {
        throw new BadRequestException({
          error: 'INVALID_PARENT',
          message: 'Parent account not found',
          details: { field: 'parent_id' },
        });
      }
    }

    const account = await this.prisma.account.create({
      data: {
        org_id: orgId,
        code,
        name,
        type: data.type,
        sub_type: data.sub_type,
        parent_id: data.parent_id,
        opening_balance: data.opening_balance || 0,
        description: data.description,
        is_system: false,
        is_active: true,
      },
    });

    return account;
  }

  /**
   * Update account details. System accounts have limited editable fields.
   */
  async update(
    orgId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      sub_type?: string;
      description?: string;
      is_active?: boolean;
    },
  ) {
    const account = await this.prisma.account.findFirst({
      where: { id, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // System accounts: only name and description can be updated
    if (account.is_system) {
      const allowedKeys = ['name', 'description'];
      const attemptedKeys = Object.keys(data).filter(
        (k) => data[k as keyof typeof data] !== undefined,
      );
      const disallowed = attemptedKeys.filter((k) => !allowedKeys.includes(k));
      if (disallowed.length > 0) {
        throw new BadRequestException(
          `System accounts can only update: ${allowedKeys.join(', ')}`,
        );
      }
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== account.code) {
      const existing = await this.prisma.account.findFirst({
        where: { org_id: orgId, code: data.code },
      });
      if (existing) {
        throw new ConflictException(`Account code "${data.code}" already exists`);
      }
    }

    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an account. Cannot delete system accounts or accounts with transactions.
   */
  async remove(orgId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, org_id: orgId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.is_system) {
      throw new BadRequestException('System accounts cannot be deleted');
    }

    // Check if account has journal lines
    const lineCount = await this.prisma.journalLine.count({
      where: { account_id: id },
    });
    if (lineCount > 0) {
      throw new BadRequestException(
        'Cannot delete account with existing transactions. Deactivate it instead.',
      );
    }

    // Check for child accounts
    const childCount = await this.prisma.account.count({
      where: { parent_id: id },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete account with child accounts. Remove children first.',
      );
    }

    await this.prisma.account.delete({ where: { id } });

    return { message: 'Account deleted successfully' };
  }

  /**
   * Get accounts as a hierarchical tree structure with computed balances.
   */
  async getTree(orgId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, is_active: true },
      orderBy: { code: 'asc' },
    });

    // Aggregate debit/credit totals per account from posted journal entries
    const balances = await this.prisma.journalLine.groupBy({
      by: ['account_id'],
      where: {
        entry: { org_id: orgId, is_posted: true },
      },
      _sum: { debit: true, credit: true },
    });

    const balanceMap = new Map<string, { debit: number; credit: number }>();
    for (const b of balances) {
      balanceMap.set(b.account_id, {
        debit: Number(b._sum.debit || 0),
        credit: Number(b._sum.credit || 0),
      });
    }

    // Build tree from flat list
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const account of accounts) {
      const txn = balanceMap.get(account.id) || { debit: 0, credit: 0 };
      const opening = Number(account.opening_balance || 0);

      // Asset & Expense: debit-normal; Liability, Equity, Income: credit-normal
      const isDebitNormal = ['asset', 'expense'].includes(account.type);
      const balance = isDebitNormal
        ? opening + txn.debit - txn.credit
        : opening + txn.credit - txn.debit;

      map.set(account.id, { ...account, balance, children: [] });
    }

    for (const account of accounts) {
      const node = map.get(account.id);
      if (account.parent_id && map.has(account.parent_id)) {
        map.get(account.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Roll up children balances to parent accounts
    const rollUp = (node: any): number => {
      if (node.children.length === 0) return node.balance;
      let childTotal = 0;
      for (const child of node.children) {
        childTotal += rollUp(child);
      }
      node.balance = childTotal;
      return node.balance;
    };

    for (const root of roots) {
      rollUp(root);
    }

    return roots;
  }
}
