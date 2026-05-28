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
  @ApiOperation({ summary: 'List the 45 standard GST UQC codes' })
  listUqcCodes() {
    // Stable list — keeping it server-side so frontend doesn't need
    // to be redeployed when GSTN publishes additions, and so any new
    // unit form validates against the same source as the API.
    return GST_UQC_CODES;
  }

  @Get()
  @ApiOperation({ summary: 'List all units for the current org' })
  async findAll(@OrgId() orgId: string) {
    return this.unitsService.findAll(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom unit' })
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
  @ApiOperation({ summary: 'Update a unit' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.unitsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a unit (soft delete)' })
  async deactivate(@OrgId() orgId: string, @Param('id') id: string) {
    return this.unitsService.deactivate(orgId, id);
  }

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Seed default unit list (idempotent)' })
  async seed(@OrgId() orgId: string) {
    return this.unitsService.seedDefaults(orgId);
  }
}
