import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_UNITS, isValidUqc } from './uqc-codes';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed the per-org master list of units. Idempotent — uses
   * createMany skipDuplicates so we can call this both on org-create
   * (proactive) and lazily on first GET (back-fill for orgs that
   * predate this feature). System units are marked is_system=true so
   * they can be deactivated but not hard-deleted, and tagged-as-seeded
   * so a re-seed pass won't double them up.
   */
  async seedDefaults(orgId: string): Promise<{ created: number }> {
    const existing = await this.prisma.unitOfMeasurement.findMany({
      where: { org_id: orgId },
      select: { symbol: true },
    });
    const existingSymbols = new Set(existing.map((u) => u.symbol));
    const toCreate = DEFAULT_UNITS.filter(
      (u) => !existingSymbols.has(u.symbol),
    );
    if (toCreate.length === 0) return { created: 0 };

    const result = await this.prisma.unitOfMeasurement.createMany({
      data: toCreate.map((u) => ({
        org_id: orgId,
        name: u.name,
        symbol: u.symbol,
        uqc_code: u.uqc_code,
        category: u.category,
        decimals: u.decimals,
        is_system: true,
        is_active: true,
      })),
      skipDuplicates: true,
    });

    return { created: result.count };
  }

  /**
   * List org's units. Lazy-seeds on empty so a freshly-created org
   * (or one that predates the seed-on-create hook) gets the
   * defaults the first time the page is opened, with no admin action
   * required.
   */
  async findAll(orgId: string) {
    let units = await this.prisma.unitOfMeasurement.findMany({
      where: { org_id: orgId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    if (units.length === 0) {
      await this.seedDefaults(orgId);
      units = await this.prisma.unitOfMeasurement.findMany({
        where: { org_id: orgId },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    }
    return units;
  }

  async findOne(orgId: string, id: string) {
    const unit = await this.prisma.unitOfMeasurement.findFirst({
      where: { id, org_id: orgId },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async create(
    orgId: string,
    data: {
      name: string;
      symbol: string;
      uqc_code: string;
      category?: string;
      decimals?: number;
    },
  ) {
    const name = (data.name || '').trim();
    const symbol = (data.symbol || '').trim().toUpperCase();
    const uqc = (data.uqc_code || '').trim().toUpperCase();
    if (!name || !symbol) {
      throw new BadRequestException({
        error: 'INVALID_UNIT',
        message: 'Name and symbol are required',
        details: { field: !name ? 'name' : 'symbol' },
      });
    }
    // UQC is mandatory — without it the unit can't appear in the
    // GSTR-1 HSN summary JSON, and the GST portal upload would fail.
    if (!uqc || !isValidUqc(uqc)) {
      throw new BadRequestException({
        error: 'INVALID_UQC',
        message:
          'GST UQC code is required. Pick one of the 45 standard codes (use OTH-OTHERS for services).',
        details: { field: 'uqc_code' },
      });
    }

    const dupSymbol = await this.prisma.unitOfMeasurement.findFirst({
      where: { org_id: orgId, symbol },
    });
    if (dupSymbol) {
      throw new ConflictException({
        error: 'DUPLICATE_SYMBOL',
        message: `A unit with symbol "${symbol}" already exists.`,
        details: { field: 'symbol', existingId: dupSymbol.id },
      });
    }

    return this.prisma.unitOfMeasurement.create({
      data: {
        org_id: orgId,
        name,
        symbol,
        uqc_code: uqc,
        category: data.category || 'count',
        decimals:
          typeof data.decimals === 'number' && data.decimals >= 0
            ? Math.min(6, Math.floor(data.decimals))
            : 0,
        is_system: false,
        is_active: true,
      },
    });
  }

  async update(
    orgId: string,
    id: string,
    data: Partial<{
      name: string;
      symbol: string;
      uqc_code: string;
      category: string;
      decimals: number;
      is_active: boolean;
    }>,
  ) {
    const existing = await this.findOne(orgId, id);

    const patch: Record<string, any> = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.symbol !== undefined) {
      const symbol = data.symbol.trim().toUpperCase();
      if (symbol && symbol !== existing.symbol) {
        const dup = await this.prisma.unitOfMeasurement.findFirst({
          where: { org_id: orgId, symbol, id: { not: id } },
        });
        if (dup) {
          throw new ConflictException({
            error: 'DUPLICATE_SYMBOL',
            message: `Symbol "${symbol}" is used by another unit.`,
            details: { field: 'symbol' },
          });
        }
        patch.symbol = symbol;
      }
    }
    if (data.uqc_code !== undefined) {
      const uqc = data.uqc_code.trim().toUpperCase();
      if (!isValidUqc(uqc)) {
        throw new BadRequestException({
          error: 'INVALID_UQC',
          message: 'Invalid GST UQC code.',
          details: { field: 'uqc_code' },
        });
      }
      patch.uqc_code = uqc;
    }
    if (data.category !== undefined) patch.category = data.category;
    if (typeof data.decimals === 'number')
      patch.decimals = Math.min(6, Math.max(0, Math.floor(data.decimals)));
    if (typeof data.is_active === 'boolean') patch.is_active = data.is_active;

    return this.prisma.unitOfMeasurement.update({
      where: { id },
      data: patch,
    });
  }

  /**
   * Soft-delete a unit. We never hard-delete because historical
   * products / invoice items may still reference the unit and we
   * want their reports to keep rendering. System-seeded units can
   * also be deactivated — the user might not want "Per Word" in
   * their dropdown.
   */
  async deactivate(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.unitOfMeasurement.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
