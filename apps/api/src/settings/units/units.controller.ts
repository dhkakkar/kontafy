import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { GST_UQC_CODES } from './uqc-codes';

@ApiTags('Settings')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('settings/units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  // Note: the global ResponseInterceptor wraps every return value into
  // `{ success: true, data: ... }`. So controllers return the payload
  // directly — wrapping ourselves in `{ data: ... }` would double-wrap
  // and force callers to do `res.data.data`. The pagination branch
  // (data + meta both present) is the only place wrapping ourselves
  // is required, and units aren't paginated.

  @Get('uqc-codes')
  @ApiOperation({
    summary: 'List the 45 standard GST UQC codes',
    description:
      'Returns the GSTN-published Unit Quantity Code list (NOS, KGS, MTR, etc.) used on invoices and GST returns. Static reference data — kept server-side so frontend changes do not require a redeploy when GSTN publishes additions.',
  })
  listUqcCodes() {
    // Stable list — keeping it server-side so frontend doesn't need
    // to be redeployed when GSTN publishes additions, and so any new
    // unit form validates against the same source as the API.
    return GST_UQC_CODES;
  }

  @Get()
  @ApiOperation({
    summary: 'List all units for the current org',
    description:
      'Returns every active unit of measurement configured for the organization (both system seeds and custom units). Each unit carries its display symbol, mapped UQC code and the number of decimals it allows in quantity inputs.',
  })
  async findAll(@OrgId() orgId: string) {
    return this.unitsService.findAll(orgId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a custom unit',
    description:
      'Adds a new unit of measurement to the org. The `uqc_code` must be one of the 45 standard GST UQC codes (see `GET /settings/units/uqc-codes`) — the API rejects unknown codes to keep downstream GST returns valid. Once created the unit can be assigned to products.',
  })
  async create(
    @OrgId() orgId: string,
    @Body()
    body: {
      name: string;
      symbol: string;
      uqc_code: string;
      category?: string;
      decimals?: number;
    },
  ) {
    return this.unitsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a unit',
    description:
      'Patches the unit\'s display name, symbol, category, decimals or UQC code. Existing invoice/bill line items keep their snapshotted unit text, so renaming is non-destructive.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.unitsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate a unit (soft delete)',
    description:
      'Flips `is_active` to false so the unit no longer appears in selectors. The unit row is preserved (not deleted) to avoid breaking historical product references. To revive it, set `is_active: true` via `PATCH /settings/units/:id`.',
  })
  async deactivate(@OrgId() orgId: string, @Param('id') id: string) {
    return this.unitsService.deactivate(orgId, id);
  }

  @Post('seed-defaults')
  @ApiOperation({
    summary: 'Seed default unit list (idempotent)',
    description:
      'Creates the standard set of units (NOS, KGS, MTR, PCS, etc.) for the org if they don\'t already exist. Safe to call repeatedly — existing units are skipped based on `(org_id, symbol)`. Typically invoked once during onboarding.',
  })
  async seed(@OrgId() orgId: string) {
    return this.unitsService.seedDefaults(orgId);
  }
}
