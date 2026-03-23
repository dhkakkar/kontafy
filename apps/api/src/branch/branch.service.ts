import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new branch for an organization.
   */
  async create(
    orgId: string,
    userId: string,
    data: {
      name: string;
      code?: string;
      address?: Record<string, any>;
      phone?: string;
      email?: string;
      manager_name?: string;
      is_main?: boolean;
    },
  ) {
    // Auto-generate code if not provided
    const code = data.code || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

    // If setting as main branch, unset any existing main
    if (data.is_main) {
      await this.prisma.branch.updateMany({
        where: { org_id: orgId, is_main: true },
        data: { is_main: false },
      });
    }

    return this.prisma.branch.create({
      data: {
        org_id: orgId,
        name: data.name,
        code,
        address: data.address || {},
        phone: data.phone,
        email: data.email,
        manager_name: data.manager_name,
        is_main: data.is_main || false,
        created_by: userId,
      },
    });
  }

  /**
   * List branches with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      search?: string;
      isActive?: boolean;
    },
  ) {
    const { search, isActive } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };

    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        orderBy: [{ is_main: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.branch.count({ where }),
    ]);

    return {
      data: branches,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single branch by ID.
   */
  async findOne(orgId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, org_id: orgId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  /**
   * Get branch-wise P&L summary by aggregating journal entries tagged to this branch.
   */
  async getBranchSummary(
    orgId: string,
    branchId: string,
    filters: { from?: string; to?: string },
  ) {
    const branch = await this.findOne(orgId, branchId);

    const dateFilter: any = {};
    if (filters.from) dateFilter.gte = new Date(filters.from);
    if (filters.to) dateFilter.lte = new Date(filters.to);

    // Revenue: credit side of income accounts for this branch
    const revenueLines = await this.prisma.journalLine.findMany({
      where: {
        entry: {
          org_id: orgId,
          is_posted: true,
          reference: branchId,
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
        account: { type: 'income' },
      },
      select: { credit: true, debit: true },
    });

    const revenue = revenueLines.reduce(
      (sum, line) => sum + (Number(line.credit) - Number(line.debit)),
      0,
    );

    // Expenses: debit side of expense accounts for this branch
    const expenseLines = await this.prisma.journalLine.findMany({
      where: {
        entry: {
          org_id: orgId,
          is_posted: true,
          reference: branchId,
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
        account: { type: 'expense' },
      },
      select: { credit: true, debit: true },
    });

    const expenses = expenseLines.reduce(
      (sum, line) => sum + (Number(line.debit) - Number(line.credit)),
      0,
    );

    // Count invoices linked to this branch
    const invoiceCount = await this.prisma.invoice.count({
      where: {
        org_id: orgId,
        e_invoice_irn: branchId, // Using e_invoice_irn field as branch tag
      },
    });

    return {
      branch,
      summary: {
        revenue: Math.round(revenue * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        profit: Math.round((revenue - expenses) * 100) / 100,
        invoiceCount,
      },
    };
  }

  /**
   * Get stock levels for a specific branch.
   */
  async getBranchStock(
    orgId: string,
    branchId: string,
    filters: { page: number; limit: number; search?: string },
  ) {
    await this.findOne(orgId, branchId);

    const { search } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      org_id: orgId,
      warehouse: { branch_id: branchId },
    };

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [stockLevels, total] = await Promise.all([
      this.prisma.stockLevel.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true, selling_price: true },
          },
          warehouse: {
            select: { id: true, name: true },
          },
        },
        orderBy: { product: { name: 'asc' } },
        skip,
        take: limit,
      }),
      this.prisma.stockLevel.count({ where }),
    ]);

    return {
      data: stockLevels,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update a branch.
   */
  async update(orgId: string, id: string, data: Record<string, any>) {
    const branch = await this.findOne(orgId, id);

    // If setting as main, unset others
    if (data.is_main && !branch.is_main) {
      await this.prisma.branch.updateMany({
        where: { org_id: orgId, is_main: true },
        data: { is_main: false },
      });
    }

    const { org_id, created_by, created_at, ...updateData } = data;

    return this.prisma.branch.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Soft-delete (deactivate) a branch.
   */
  async remove(orgId: string, id: string) {
    const branch = await this.findOne(orgId, id);

    if (branch.is_main) {
      throw new BadRequestException('Cannot deactivate the main branch');
    }

    await this.prisma.branch.update({
      where: { id },
      data: { is_active: false, updated_at: new Date() },
    });

    return { message: 'Branch deactivated successfully' };
  }
}
