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
    description:
      'Loads the canonical Indian-GAAP chart-of-accounts template into this org. The call is a no-op if any accounts already exist, so the frontend can safely expose it as a "Load template" button on the empty-state of the COA page. Mainly useful for older orgs whose initial seed failed inside the Neon PgBouncer transaction budget at signup.',
  })
  async seedDefault(@OrgId() orgId: string) {
    return this.organizationService.seedDefaultAccounts(orgId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get chart of accounts (flat list)',
    description:
      'Returns every account in the org as a flat array, optionally filtered by `type` (asset, liability, equity, income, expense) and `active_only`. Each row carries its code, name, parent_id, balance type, and current balance — pair with `GET /books/accounts/tree` if you need parent/child nesting.',
  })
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
  @ApiOperation({
    summary: 'Get accounts as a hierarchical tree',
    description:
      'Returns the chart of accounts nested by `parent_id` so the frontend can render an expandable tree without doing client-side regrouping. Roll-up balances on each parent reflect the sum of all descendants.',
  })
  async getTree(@OrgId() orgId: string) {
    return this.accountsService.getTree(orgId);
  }

  @Get('opening-balances')
  @ApiOperation({
    summary:
      'List all accounts with their current opening balance (sourced from posted OB journals) for the bulk-edit page',
    description:
      'Returns one row per account with its existing opening balance split into debit/credit columns, sourced from the journal lines tagged as opening-balance entries. Used to hydrate the bulk-edit grid on the Opening Balances setup page so the user sees their current values before changing them.',
  })
  async listOpeningBalances(@OrgId() orgId: string) {
    return this.accountsService.listOpeningBalances(orgId);
  }

  @Post('opening-balances/bulk')
  @ApiOperation({
    summary:
      'Replace opening balances for many accounts in one call. Validates sum(debit) === sum(credit) before posting.',
    description:
      'Wipes the existing opening-balance journal and posts a fresh balanced entry covering every row in `entries`. Rejects the call with 400 if total debits do not equal total credits. Optionally sets `books_begin_from` so the rest of the books treat that date as the start of the fiscal record.',
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
  @ApiOperation({
    summary: 'Export chart of accounts as a styled XLSX file',
    description:
      'Streams the filtered chart of accounts as a formatted XLSX download (not raw JSON). Supports the same `type` and `search` filters as the list endpoint plus `include_inactive` (default off) and `include_system` (default on). The response is sent with a `Content-Disposition: attachment` header.',
  })
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
  @ApiOperation({
    summary: 'Get account details',
    description:
      'Returns a single account record by id including its type, sub-type, parent, opening balance metadata, and current running balance. For the line-level ledger of this account, call `GET /books/ledger/:accountId`.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.accountsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new account',
    description:
      'Creates a user-defined account under the given `type` and (optionally) `parent_id`. If `opening_balance` is non-zero, a balanced journal entry is automatically posted against the suspense account (code 3099) so the Trial Balance reflects the new opening on the chosen `opening_date`. Account `code` must be unique within the org.',
  })
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
  @ApiOperation({
    summary: 'Update account',
    description:
      'Updates editable fields on an account — name, code, sub-type, description, active flag, and opening balance. Changing the opening balance reposts the underlying suspense journal so reports stay in sync. Account `type` itself is immutable to protect the integrity of historical reports.',
  })
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
  @ApiOperation({
    summary: 'Delete account (only non-system accounts with no transactions)',
    description:
      'Hard-deletes a user-created account. The call is rejected if the account is flagged `is_system` (e.g. the bundled defaults) or has any posted journal lines referencing it. To remove an account that has activity, deactivate it via `PATCH /books/accounts/:id` with `is_active: false` instead.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.accountsService.remove(orgId, id);
  }
}
