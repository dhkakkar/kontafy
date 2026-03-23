import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from '../dto/expenses.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List expenses with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      status?: string;
      search?: string;
      from?: string;
      to?: string;
    },
  ) {
    const { status, search, from, to } = filters;

    const where: any = {
      org_id: orgId,
    };

    if (status) where.status = status;

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { vendor_name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    });

    return expenses;
  }

  /**
   * Get a single expense by ID.
   */
  async findOne(orgId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, org_id: orgId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  /**
   * Create a new expense.
   */
  async create(orgId: string, userId: string, data: CreateExpenseDto) {
    const expense = await this.prisma.expense.create({
      data: {
        org_id: orgId,
        date: new Date(data.date),
        category: data.category,
        description: data.description,
        amount: data.amount,
        payment_method: data.payment_method,
        reference: data.reference || null,
        vendor_name: data.vendor_name || null,
        notes: data.notes || null,
        status: 'pending',
        created_by: userId,
      },
    });

    return expense;
  }

  /**
   * Update an expense.
   */
  async update(orgId: string, id: string, data: UpdateExpenseDto) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, org_id: orgId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const updateData: any = {};
    if (data.date) updateData.date = new Date(data.date);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.payment_method !== undefined) updateData.payment_method = data.payment_method;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.vendor_name !== undefined) updateData.vendor_name = data.vendor_name;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;
    updateData.updated_at = new Date();

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete an expense.
   */
  async remove(orgId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, org_id: orgId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }
}
