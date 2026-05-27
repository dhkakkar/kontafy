import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AccountsService } from './accounts.service';
import { OrganizationService } from '../../organization/organization.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Books')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('books/accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly organizationService: OrganizationService,
  ) {}

  // Lets a regular org member trigger the default-chart seed from the
  // /books/accounts page's empty state. This is the same seed that runs
  // automatically at org creation — exposed here as an idempotent "Load
  // Template" action for orgs that landed on an empty COA (e.g. older
  // orgs whose initial seed failed inside Neon's PgBouncer txn budget).
  @Post('seed-default')
  @ApiOperation({
    summary:
      'Seed the default chart of accounts if this organization has none yet (idempotent)',
  })
  async seedDefault(@OrgId() orgId: string) {
    return this.organizationService.seedDefaultAccounts(orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Get chart of accounts (flat list)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by account type' })
  @ApiQuery({ name: 'active_only', required: false, type: Boolean })
  async findAll(
    @OrgId() orgId: string,
    @Query('type') type?: string,
    @Query('active_only') activeOnly?: boolean,
  ) {
    return this.accountsService.findAll(orgId, { type, activeOnly });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get accounts as a hierarchical tree' })
  async getTree(@OrgId() orgId: string) {
    return this.accountsService.getTree(orgId);
  }

  @Get('opening-balances')
  @ApiOperation({
    summary:
      'List all accounts with their current opening balance (sourced from posted OB journals) for the bulk-edit page',
  })
  async listOpeningBalances(@OrgId() orgId: string) {
    return this.accountsService.listOpeningBalances(orgId);
  }

  @Post('opening-balances/bulk')
  @ApiOperation({
    summary:
      'Replace opening balances for many accounts in one call. Validates sum(debit) === sum(credit) before posting.',
  })
  async saveOpeningBalancesBulk(
    @OrgId() orgId: string,
    @Body()
    body: {
      books_begin_from?: string;
      entries: Array<{
        account_id: string;
        debit?: number;
        credit?: number;
      }>;
    },
  ) {
    return this.accountsService.saveOpeningBalancesBulk(
      orgId,
      body?.entries || [],
      body?.books_begin_from,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export chart of accounts as a styled XLSX file' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by account type' })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by code or name substring' })
  @ApiQuery({
    name: 'include_inactive',
    required: false,
    type: Boolean,
    description: 'Include is_active=false rows (default false)',
  })
  @ApiQuery({
    name: 'include_system',
    required: false,
    type: Boolean,
    description: 'Include is_system=true rows (default true)',
  })
  async exportXlsx(
    @OrgId() orgId: string,
    @Res() res: Response,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('include_inactive') includeInactive?: string,
    @Query('include_system') includeSystem?: string,
  ) {
    const { buffer, filename } = await this.accountsService.exportXlsx(orgId, {
      type,
      search,
      // Query params arrive as strings; treat anything other than 'false'
      // as truthy for include_system (default ON), and anything other than
      // 'true' as falsy for include_inactive (default OFF).
      includeInactive: includeInactive === 'true',
      includeSystem: includeSystem !== 'false',
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account details' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.accountsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  async create(
    @OrgId() orgId: string,
    @Body()
    body: {
      code: string;
      name: string;
      type: string;
      sub_type?: string;
      parent_id?: string;
      // Opening balance is signed by `opening_dr_cr` ('Dr' | 'Cr'). The
      // service posts a balanced journal entry against the suspense
      // account (code 3099) when opening_balance != 0, so the Trial
      // Balance reflects this from day one.
      opening_balance?: number;
      opening_dr_cr?: 'Dr' | 'Cr';
      opening_date?: string;
      description?: string;
    },
  ) {
    return this.accountsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      code?: string;
      sub_type?: string;
      description?: string;
      is_active?: boolean;
      opening_balance?: number;
      opening_dr_cr?: 'Dr' | 'Cr';
      opening_date?: string;
    },
  ) {
    return this.accountsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete account (only non-system accounts with no transactions)' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.accountsService.remove(orgId, id);
  }
}
