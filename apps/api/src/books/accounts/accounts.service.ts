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
    // Validate account type
    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(
        `Invalid account type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    // Check for duplicate code within org
    const existing = await this.prisma.account.findFirst({
      where: { org_id: orgId, code: data.code },
    });
    if (existing) {
      throw new ConflictException(`Account code "${data.code}" already exists`);
    }

    // Validate parent if provided
    if (data.parent_id) {
      const parent = await this.prisma.account.findFirst({
        where: { id: data.parent_id, org_id: orgId },
      });
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
    }

    const account = await this.prisma.account.create({
      data: {
        org_id: orgId,
        code: data.code,
        name: data.name,
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
   * Get accounts as a hierarchical tree structure.
   */
  async getTree(orgId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, is_active: true },
      orderBy: { code: 'asc' },
    });

    // Build tree from flat list
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const account of accounts) {
      map.set(account.id, { ...account, children: [] });
    }

    for (const account of accounts) {
      const node = map.get(account.id);
      if (account.parent_id && map.has(account.parent_id)) {
        map.get(account.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
