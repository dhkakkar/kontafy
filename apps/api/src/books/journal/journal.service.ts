import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List journal entries with pagination and date filtering.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      from?: string;
      to?: string;
      posted?: boolean;
    },
  ) {
    const { from, to, posted } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    if (posted !== undefined) {
      where.is_posted = posted;
    }

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { entry_number: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
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
   * Get a single journal entry with all lines.
   */
  async findOne(orgId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, org_id: orgId },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return entry;
  }

  /**
   * Create a new journal entry with lines.
   * Validates that debits == credits (double-entry accounting).
   */
  async create(
    orgId: string,
    userId: string,
    data: {
      date: string;
      narration?: string;
      reference?: string;
      reference_type?: string;
      reference_id?: string;
      is_posted?: boolean;
      lines: Array<{
        account_id: string;
        debit: number;
        credit: number;
        description?: string;
      }>;
    },
  ) {
    // Validate: at least 2 lines
    if (!data.lines || data.lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }

    // Validate: debits == credits
    const totalDebit = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})`,
      );
    }

    // Validate: each line has either debit or credit (not both)
    for (const line of data.lines) {
      if ((line.debit || 0) > 0 && (line.credit || 0) > 0) {
        throw new BadRequestException(
          'A journal line cannot have both debit and credit amounts',
        );
      }
      if ((line.debit || 0) === 0 && (line.credit || 0) === 0) {
        throw new BadRequestException(
          'A journal line must have either a debit or credit amount',
        );
      }
    }

    // Validate all account IDs belong to this org
    const accountIds = data.lines.map((l) => l.account_id);
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, org_id: orgId, is_active: true },
    });

    if (accounts.length !== new Set(accountIds).size) {
      throw new BadRequestException('One or more account IDs are invalid or inactive');
    }

    // Create entry with lines in a transaction
    const entry = await this.prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          org_id: orgId,
          date: new Date(data.date),
          narration: data.narration,
          reference: data.reference,
          reference_type: data.reference_type,
          reference_id: data.reference_id,
          is_posted: data.is_posted || false,
          created_by: userId,
        },
      });

      await tx.journalLine.createMany({
        data: data.lines.map((line) => ({
          entry_id: journalEntry.id,
          account_id: line.account_id,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description,
        })),
      });

      return tx.journalEntry.findUnique({
        where: { id: journalEntry.id },
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true, type: true } },
            },
          },
        },
      });
    });

    return entry;
  }

  /**
   * Post (finalize) a draft journal entry.
   * Once posted, an entry cannot be edited — only voided.
   */
  async postEntry(orgId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, org_id: orgId },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.is_posted) {
      throw new BadRequestException('Journal entry is already posted');
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: { is_posted: true },
      include: { lines: true },
    });
  }

  /**
   * Void a journal entry by creating a reversing entry.
   */
  async voidEntry(orgId: string, userId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, org_id: orgId },
      include: { lines: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    // Create reversing entry
    const reversingEntry = await this.prisma.$transaction(async (tx) => {
      const reversal = await tx.journalEntry.create({
        data: {
          org_id: orgId,
          date: new Date(),
          narration: `Reversal of entry #${entry.entry_number}: ${entry.narration || ''}`,
          reference: `VOID-${entry.id}`,
          reference_type: 'reversal',
          reference_id: entry.id,
          is_posted: true,
          created_by: userId,
        },
      });

      // Swap debits and credits
      await tx.journalLine.createMany({
        data: entry.lines.map((line) => ({
          entry_id: reversal.id,
          account_id: line.account_id,
          debit: line.credit,
          credit: line.debit,
          description: `Reversal: ${line.description || ''}`,
        })),
      });

      return reversal;
    });

    return {
      original_entry: entry,
      reversing_entry: reversingEntry,
      message: 'Journal entry voided successfully',
    };
  }
}
