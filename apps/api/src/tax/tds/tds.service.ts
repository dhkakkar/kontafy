import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTdsEntryDto } from '../dto/tds.dto';

interface TdsSectionSummary {
  section: string;
  total_gross_amount: number;
  total_tds_amount: number;
  entry_count: number;
  entries_pending: number;
  entries_deposited: number;
}

@Injectable()
export class TdsService {
  private readonly logger = new Logger(TdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List TDS entries for an organization with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      section?: string;
      status?: string;
      from?: string;
      to?: string;
    },
  ) {
    const { section, status, from, to } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TdsEntryWhereInput = { org_id: orgId };
    if (section) where.section = section;
    if (status) where.status = status;

    if (from || to) {
      where.transaction_date = {};
      if (from) where.transaction_date.gte = new Date(from);
      if (to) where.transaction_date.lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
      this.prisma.tdsEntry.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true, company_name: true, pan: true },
          },
        },
        orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.tdsEntry.count({ where }),
    ]);

    return {
      data: entries,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new TDS deduction entry.
   */
  async create(orgId: string, data: CreateTdsEntryDto) {
    // Validate contact if provided
    if (data.contact_id) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: data.contact_id, org_id: orgId },
      });
      if (!contact) {
        throw new NotFoundException('Contact not found');
      }
    }

    return this.prisma.tdsEntry.create({
      data: {
        org_id: orgId,
        contact_id: data.contact_id || null,
        section: data.section,
        transaction_date: new Date(data.transaction_date),
        gross_amount: data.gross_amount,
        tds_rate: data.tds_rate,
        tds_amount: data.tds_amount,
        payment_id: data.payment_id || null,
        status: 'pending',
      },
      include: {
        contact: {
          select: { id: true, name: true, company_name: true, pan: true },
        },
      },
    });
  }

  /**
   * Get TDS summary grouped by section for a given period.
   */
  async getSummary(orgId: string, from: string, to: string): Promise<TdsSectionSummary[]> {
    const entries = await this.prisma.tdsEntry.findMany({
      where: {
        org_id: orgId,
        transaction_date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      select: {
        section: true,
        gross_amount: true,
        tds_amount: true,
        status: true,
      },
    });

    const sectionMap = new Map<string, TdsSectionSummary>();

    for (const entry of entries) {
      const existing = sectionMap.get(entry.section) || {
        section: entry.section,
        total_gross_amount: 0,
        total_tds_amount: 0,
        entry_count: 0,
        entries_pending: 0,
        entries_deposited: 0,
      };

      existing.total_gross_amount += this.toNum(entry.gross_amount);
      existing.total_tds_amount += this.toNum(entry.tds_amount);
      existing.entry_count += 1;

      if (entry.status === 'pending') {
        existing.entries_pending += 1;
      } else if (entry.status === 'deposited') {
        existing.entries_deposited += 1;
      }

      sectionMap.set(entry.section, existing);
    }

    return Array.from(sectionMap.values()).map((s) => ({
      ...s,
      total_gross_amount: this.round(s.total_gross_amount),
      total_tds_amount: this.round(s.total_tds_amount),
    }));
  }

  private toNum(val: any): number {
    if (val === null || val === undefined) return 0;
    const n = typeof val === 'number' ? val : Number(val);
    return isNaN(n) ? 0 : n;
  }

  private round(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
