import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new budget with line items (monthly allocations per account).
   */
  async create(orgId: string, userId: string, data: CreateBudgetDto) {
    // Validate accounts exist
    const accountIds = data.line_items.map((li) => li.account_id);
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, org_id: orgId },
      select: { id: true },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more accounts not found');
    }

    // Compute total budget amount
    const totalAmount = data.line_items.reduce((sum, li) => {
      return (
        sum +
        (li.jan || 0) + (li.feb || 0) + (li.mar || 0) +
        (li.apr || 0) + (li.may || 0) + (li.jun || 0) +
        (li.jul || 0) + (li.aug || 0) + (li.sep || 0) +
        (li.oct || 0) + (li.nov || 0) + (li.dec || 0)
      );
    }, 0);

    const budget = await this.prisma.$transaction(async (tx) => {
      const b = await tx.budget.create({
        data: {
          org_id: orgId,
          name: data.name,
          description: data.description,
          fiscal_year: data.fiscal_year || this.getCurrentFiscalYear(),
          period_type: data.period_type || 'monthly',
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
          branch_id: data.branch_id,
          total_amount: totalAmount,
          status: 'draft',
          created_by: userId,
        },
      });

      await tx.budgetLineItem.createMany({
        data: data.line_items.map((li) => ({
          budget_id: b.id,
          account_id: li.account_id,
          jan: li.jan || 0,
          feb: li.feb || 0,
          mar: li.mar || 0,
          apr: li.apr || 0,
          may: li.may || 0,
          jun: li.jun || 0,
          jul: li.jul || 0,
          aug: li.aug || 0,
          sep: li.sep || 0,
          oct: li.oct || 0,
          nov: li.nov || 0,
          dec: li.dec || 0,
        })),
      });

      return tx.budget.findUnique({
        where: { id: b.id },
        include: {
          line_items: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true } },
            },
          },
        },
      });
    });

    return budget;
  }

  /**
   * List budgets with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      status?: string;
      fiscalYear?: string;
    },
  ) {
    const { status, fiscalYear } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };
    if (status) where.status = status;
    if (fiscalYear) where.fiscal_year = fiscalYear;

    const [budgets, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: [{ created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.budget.count({ where }),
    ]);

    return {
      data: budgets,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single budget with all line items.
   */
  async findOne(orgId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, org_id: orgId },
      include: {
        line_items: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
          orderBy: { account: { name: 'asc' } },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return budget;
  }

  /**
   * Get summary across all active budgets.
   */
  async getSummary(orgId: string) {
    const activeBudgets = await this.prisma.budget.findMany({
      where: { org_id: orgId, status: 'active' },
      include: {
        line_items: {
          include: {
            account: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });

    let totalBudgeted = 0;
    let totalActual = 0;

    for (const budget of activeBudgets) {
      totalBudgeted += Number(budget.total_amount);
    }

    // Get actual spending from journal entries in current fiscal year
    const { fyStart, fyEnd } = this.getFiscalYearDates();

    const actualLines = await this.prisma.journalLine.findMany({
      where: {
        entry: {
          org_id: orgId,
          is_posted: true,
          date: { gte: fyStart, lte: fyEnd },
        },
        account: { type: 'expense' },
      },
      select: { debit: true, credit: true },
    });

    totalActual = actualLines.reduce(
      (sum, line) => sum + (Number(line.debit) - Number(line.credit)),
      0,
    );

    return {
      totalBudgeted: Math.round(totalBudgeted * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      variance: Math.round((totalBudgeted - totalActual) * 100) / 100,
      variancePercent:
        totalBudgeted > 0
          ? Math.round(((totalBudgeted - totalActual) / totalBudgeted) * 10000) / 100
          : 0,
      activeBudgetCount: activeBudgets.length,
    };
  }

  /**
   * Compute budget vs actual variance report.
   * Compares budgeted amounts with actual journal entry debits/credits per account.
   */
  async getVariance(
    orgId: string,
    filters: {
      budgetId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const { budgetId, from, to } = filters;

    // Get budgets to analyze
    const where: any = { org_id: orgId, status: 'active' };
    if (budgetId) where.id = budgetId;

    const budgets = await this.prisma.budget.findMany({
      where,
      include: {
        line_items: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    if (budgets.length === 0) {
      return { data: [], message: 'No active budgets found' };
    }

    // Determine date range
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    if (!from && !to) {
      const { fyStart, fyEnd } = this.getFiscalYearDates();
      dateFilter.gte = fyStart;
      dateFilter.lte = fyEnd;
    }

    // Collect all account IDs from budget line items
    const accountIds = new Set<string>();
    const budgetByAccount = new Map<
      string,
      { account: any; budgeted: number; months: number[] }
    >();

    for (const budget of budgets) {
      for (const li of budget.line_items) {
        accountIds.add(li.account_id);

        const monthlyAmounts = [
          Number(li.apr), Number(li.may), Number(li.jun),
          Number(li.jul), Number(li.aug), Number(li.sep),
          Number(li.oct), Number(li.nov), Number(li.dec),
          Number(li.jan), Number(li.feb), Number(li.mar),
        ];

        const total = monthlyAmounts.reduce((s, v) => s + v, 0);

        const existing = budgetByAccount.get(li.account_id);
        if (existing) {
          existing.budgeted += total;
          existing.months = existing.months.map((v, i) => v + monthlyAmounts[i]);
        } else {
          budgetByAccount.set(li.account_id, {
            account: li.account,
            budgeted: total,
            months: monthlyAmounts,
          });
        }
      }
    }

    // Get actual amounts from journal entries grouped by account
    const actuals = await this.prisma.journalLine.groupBy({
      by: ['account_id'],
      where: {
        account_id: { in: Array.from(accountIds) },
        entry: {
          org_id: orgId,
          is_posted: true,
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
      },
      _sum: { debit: true, credit: true },
    });

    const actualByAccount = new Map<string, number>();
    for (const row of actuals) {
      // For expense accounts: actual = debit - credit
      // For income accounts: actual = credit - debit
      const account = budgetByAccount.get(row.account_id)?.account;
      const isExpense = account?.type === 'expense';
      const amount = isExpense
        ? Number(row._sum.debit || 0) - Number(row._sum.credit || 0)
        : Number(row._sum.credit || 0) - Number(row._sum.debit || 0);
      actualByAccount.set(row.account_id, amount);
    }

    // Build variance report
    const varianceData = Array.from(budgetByAccount.entries()).map(
      ([accountId, { account, budgeted, months }]) => {
        const actual = actualByAccount.get(accountId) || 0;
        const variance = budgeted - actual;
        const variancePct = budgeted > 0 ? (variance / budgeted) * 100 : 0;
        const utilized = budgeted > 0 ? (actual / budgeted) * 100 : 0;

        return {
          accountId,
          account,
          budgeted: Math.round(budgeted * 100) / 100,
          actual: Math.round(actual * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          variancePercent: Math.round(variancePct * 100) / 100,
          utilized: Math.round(utilized * 100) / 100,
          monthlyBudget: months.map((v) => Math.round(v * 100) / 100),
          status: utilized > 100 ? 'over_budget' : utilized > 80 ? 'warning' : 'on_track',
        };
      },
    );

    const totals = varianceData.reduce(
      (acc, row) => ({
        budgeted: acc.budgeted + row.budgeted,
        actual: acc.actual + row.actual,
        variance: acc.variance + row.variance,
      }),
      { budgeted: 0, actual: 0, variance: 0 },
    );

    return {
      data: varianceData,
      totals: {
        ...totals,
        variancePercent:
          totals.budgeted > 0
            ? Math.round((totals.variance / totals.budgeted) * 10000) / 100
            : 0,
        utilized:
          totals.budgeted > 0
            ? Math.round((totals.actual / totals.budgeted) * 10000) / 100
            : 0,
      },
    };
  }

  /**
   * Update a budget.
   */
  async update(orgId: string, id: string, data: UpdateBudgetDto) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, org_id: orgId },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (data.line_items) {
      return this.prisma.$transaction(async (tx) => {
        await tx.budgetLineItem.deleteMany({ where: { budget_id: id } });

        const totalAmount = data.line_items!.reduce((sum, li) => {
          return (
            sum +
            (li.jan || 0) + (li.feb || 0) + (li.mar || 0) +
            (li.apr || 0) + (li.may || 0) + (li.jun || 0) +
            (li.jul || 0) + (li.aug || 0) + (li.sep || 0) +
            (li.oct || 0) + (li.nov || 0) + (li.dec || 0)
          );
        }, 0);

        await tx.budget.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            status: data.status,
            total_amount: totalAmount,
            updated_at: new Date(),
          },
        });

        await tx.budgetLineItem.createMany({
          data: data.line_items!.map((li) => ({
            budget_id: id,
            account_id: li.account_id,
            jan: li.jan || 0,
            feb: li.feb || 0,
            mar: li.mar || 0,
            apr: li.apr || 0,
            may: li.may || 0,
            jun: li.jun || 0,
            jul: li.jul || 0,
            aug: li.aug || 0,
            sep: li.sep || 0,
            oct: li.oct || 0,
            nov: li.nov || 0,
            dec: li.dec || 0,
          })),
        });

        return tx.budget.findUnique({
          where: { id },
          include: {
            line_items: {
              include: {
                account: { select: { id: true, code: true, name: true, type: true } },
              },
            },
          },
        });
      });
    }

    // Simple update without line items
    return this.prisma.budget.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Delete a draft budget.
   */
  async remove(orgId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, org_id: orgId },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.status !== 'draft') {
      throw new BadRequestException('Only draft budgets can be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.budgetLineItem.deleteMany({ where: { budget_id: id } });
      await tx.budget.delete({ where: { id } });
    });

    return { message: 'Budget deleted successfully' };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private getCurrentFiscalYear(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    return `${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`;
  }

  private getFiscalYearDates(): { fyStart: Date; fyEnd: Date } {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStartYear = month >= 4 ? year : year - 1;
    return {
      fyStart: new Date(`${fyStartYear}-04-01`),
      fyEnd: new Date(`${fyStartYear + 1}-03-31`),
    };
  }
}
