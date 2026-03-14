import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { OrgId } from '../../common/decorators/org-id.decorator';

@ApiTags('Books')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('books/ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get(':accountId')
  @ApiOperation({ summary: 'Get ledger for a specific account' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAccountLedger(
    @OrgId() orgId: string,
    @Param('accountId') accountId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.ledgerService.getAccountLedger(orgId, accountId, {
      from,
      to,
      page,
      limit,
    });
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Generate trial balance report' })
  @ApiQuery({ name: 'as_of', required: false, description: 'As-of date (YYYY-MM-DD)' })
  async getTrialBalance(
    @OrgId() orgId: string,
    @Query('as_of') asOf?: string,
  ) {
    return this.ledgerService.getTrialBalance(orgId, asOf);
  }
}
