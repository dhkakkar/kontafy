import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { SuperadminGuard } from '../common/guards/superadmin.guard';
import { SuperadminOnly } from '../common/decorators/superadmin.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SuperadminService } from './superadmin.service';
import { SupportService } from '../support/support.service';

@ApiTags('Superadmin')
@Controller('superadmin')
@UseGuards(SuperadminGuard)
@SuperadminOnly()
export class SuperadminController {
  constructor(
    private readonly service: SuperadminService,
    private readonly supportService: SupportService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({
    summary: 'Platform dashboard stats',
    description:
      'Returns platform-wide KPIs for the superadmin console — total orgs, total users, MRR, plan-mix breakdown and recent signup/activity counters. Requires superadmin privilege; ordinary org members cannot reach this endpoint.',
  })
  async getDashboard() {
    return this.service.getDashboard();
  }

  // ── Organizations ──────────────────────────────────────────

  @Get('organizations')
  @ApiOperation({
    summary: 'List all organizations',
    description:
      'Paginated listing of every organization on the platform. Supported filters: `search` (matches name, legal name, GSTIN), `plan`, `page`, `limit`. Each row includes owner contact info and subscription summary.',
  })
  async listOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('plan') plan?: string,
  ) {
    return this.service.listOrganizations({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      plan,
    });
  }

  @Post('organizations')
  @ApiOperation({
    summary: 'Create organization with specified owner',
    description:
      'Superadmin shortcut to provision an org for a customer. Either pass an existing `owner_user_id` or supply `owner_email` + `owner_password` + `owner_full_name` to create the user inline. Seeds default chart of accounts and attaches the chosen plan; useful for onboarding enterprise customers without the self-serve signup flow.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Acme Pvt Ltd' },
        owner_user_id: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        owner_email: { type: 'string', format: 'email', example: 'owner@acme.com' },
        owner_password: { type: 'string', example: 'StrongPass#123' },
        owner_full_name: { type: 'string', example: 'Rahul Sharma' },
        legal_name: { type: 'string', example: 'Acme Private Limited' },
        gstin: { type: 'string', example: '29ABCDE1234F1Z5' },
        pan: { type: 'string', example: 'ABCDE1234F' },
        email: { type: 'string', format: 'email', example: 'contact@acme.com' },
        phone: { type: 'string', example: '+919876543210' },
        business_type: { type: 'string', example: 'Private Limited' },
        industry: { type: 'string', example: 'Technology' },
        plan: { type: 'string', example: 'pro' },
        fiscal_year_start: { type: 'number', example: 4 },
      },
    },
  })
  async createOrganization(
    @Body()
    body: {
      name: string;
      owner_user_id?: string;
      owner_email?: string;
      owner_password?: string;
      owner_full_name?: string;
      legal_name?: string;
      gstin?: string;
      pan?: string;
      email?: string;
      phone?: string;
      business_type?: string;
      industry?: string;
      plan?: string;
      fiscal_year_start?: number;
    },
  ) {
    return this.service.createOrganization(body);
  }

  @Get('organizations/:id')
  @ApiOperation({
    summary: 'Get organization detail',
    description:
      'Returns the full record for an org including members, subscription state and ad-hoc metadata. Bypasses the usual member-of-org guard — superadmins can view any tenant.',
  })
  async getOrganization(@Param('id') id: string) {
    return this.service.getOrganization(id);
  }

  @Patch('organizations/:id')
  @ApiOperation({
    summary: 'Update organization',
    description:
      'Superadmin-only patch for the org name, plan or `settings` JSON blob. Use this for manual plan overrides (e.g. enterprise contracts) that bypass the Razorpay billing flow.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Acme Pvt Ltd' },
        plan: { type: 'string', example: 'pro' },
        settings: { type: 'object', additionalProperties: true },
      },
    },
  })
  async updateOrganization(
    @Param('id') id: string,
    @Body() body: { name?: string; plan?: string; settings?: any },
  ) {
    return this.service.updateOrganization(id, body);
  }

  @Patch('organizations/:id/status')
  @ApiOperation({
    summary: 'Activate or deactivate organization',
    description:
      'Flips `is_active` on an org. Deactivating immediately blocks every member from logging into that tenant; existing sessions return 403 on the next request. The optional `reason` is stored on the audit log for later review.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['is_active'],
      properties: {
        is_active: { type: 'boolean', example: false },
        reason: { type: 'string', example: 'Non-payment of subscription dues.' },
      },
    },
  })
  async setOrganizationStatus(
    @Param('id') id: string,
    @Body() body: { is_active: boolean; reason?: string },
  ) {
    return this.service.setOrganizationStatus(id, body);
  }

  @Post('organizations/:id/seed-accounts')
  @ApiOperation({
    summary: 'Seed default chart of accounts for an existing org (idempotent)',
    description:
      'Re-seeds the standard Indian chart of accounts on an existing org. Safe to call repeatedly — accounts are upserted by code, so existing balances and journal links are preserved. Useful for orgs created before a chart-of-accounts update was rolled out.',
  })
  async seedOrgAccounts(@Param('id') id: string) {
    return this.service.seedOrgAccounts(id);
  }

  @Post('organizations/:id/backfill-journals')
  @ApiOperation({
    summary:
      'Backfill journal entries for invoices and payments that were created before auto-posting was wired in',
    description:
      'Walks every invoice, bill, payment and receipt for the org and posts any missing double-entry journal entry. Idempotent — documents that already have a linked journal are skipped. Use this exactly once after migrating an old org onto the auto-posting code path; running it again is safe but no-op.',
  })
  async backfillJournals(@Param('id') id: string) {
    return this.service.backfillJournals(id);
  }

  @Delete('organizations/:id')
  @ApiOperation({
    summary: 'Delete organization',
    description:
      'Hard-deletes an org along with all its members, accounts, transactions and stored documents. Irreversible — there is no undo. Prefer `PATCH /superadmin/organizations/:id/status` with `is_active: false` for routine deactivations.',
  })
  async deleteOrganization(@Param('id') id: string) {
    return this.service.deleteOrganization(id);
  }

  // ── Users ──────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({
    summary: 'List all platform users',
    description:
      'Paginated listing of every user account on the platform. Supports `search` (name or email), `page` and `limit`. Each row carries last-login timestamp and the list of orgs the user belongs to.',
  })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listUsers({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
    });
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get user detail',
    description:
      'Returns a single platform user with full identity, status, login history and org memberships. Used to triage support cases without going through that user\'s own session.',
  })
  async getUser(@Param('id') id: string) {
    return this.service.getUser(id);
  }

  // ── Superadmins ────────────────────────────────────────────

  @Get('admins')
  @ApiOperation({
    summary: 'List all superadmins',
    description:
      'Returns every user holding superadmin privilege along with who granted them and when. The list is small (Kontafy ops team) — use it to audit elevated access.',
  })
  async listSuperadmins() {
    return this.service.listSuperadmins();
  }

  @Post('admins')
  @ApiOperation({
    summary: 'Grant superadmin to a user',
    description:
      'Elevates a user to superadmin so they can access this entire `/superadmin` namespace and any org. The action is recorded on the audit log with the granter\'s id. The target user must already exist on the platform.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['user_id'],
      properties: {
        user_id: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
      },
    },
  })
  async grantSuperadmin(
    @Body() body: { user_id: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.grantSuperadmin(body.user_id, user.sub);
  }

  @Delete('admins/:userId')
  @ApiOperation({
    summary: 'Revoke superadmin from a user',
    description:
      'Removes the superadmin role from a user; their org memberships and platform account are untouched. They lose access to the `/superadmin` namespace on their next request.',
  })
  async revokeSuperadmin(@Param('userId') userId: string) {
    return this.service.revokeSuperadmin(userId);
  }

  // ── Audit Log ──────────────────────────────────────────────

  @Get('audit-log')
  @ApiOperation({
    summary: 'Platform-wide audit log',
    description:
      'Paginated stream of every privileged action — superadmin grants, org status flips, plan overrides, ticket assignments, etc. Supports `page` and `limit`. Use it for security review and incident forensics.',
  })
  async getAuditLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAuditLog({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ── Support Tickets ────────────────────────────────────────

  @Get('tickets')
  @ApiOperation({
    summary: 'List all support tickets across the platform',
    description:
      'Paginated cross-tenant view of every support ticket. Filters: `status` (`open` / `in_progress` / `resolved` / `closed`), `priority`, `search` (subject / description / requester), `page`, `limit`. Use this from the staff inbox; org users only see their own tickets via `GET /support/tickets`.',
  })
  async listTickets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.supportService.listAllTickets({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      priority,
      search,
    });
  }

  @Get('tickets/:id')
  @ApiOperation({
    summary: 'Get ticket detail with full message thread',
    description:
      'Returns the ticket plus every message exchanged on it. Unlike the org-scoped equivalent at `GET /support/tickets/:id`, this works for any tenant — the superadmin guard bypasses the per-org membership check.',
  })
  async getTicket(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.supportService.getTicketDetail(id, {
      userId: user.sub,
      isSuperadmin: true,
    });
  }

  @Patch('tickets/:id')
  @ApiOperation({
    summary: 'Update ticket status / priority / assignee',
    description:
      'Staff-side patch for triaging a ticket — change `status` (`open` → `in_progress` → `resolved` → `closed`), bump `priority` or reassign to another superadmin via `assigned_to` (pass `null` to unassign). Each change is audited on the ticket history.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'in_progress' },
        priority: { type: 'string', example: 'high' },
        assigned_to: {
          type: 'string',
          nullable: true,
          example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f',
        },
      },
    },
  })
  async updateTicket(
    @Param('id') id: string,
    @Body()
    body: { status?: string; priority?: string; assigned_to?: string | null },
  ) {
    return this.supportService.updateTicket(id, body);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({
    summary: 'Reply on a ticket as staff',
    description:
      'Appends a staff-authored message to the ticket thread; the requesting org sees it in their support inbox. The message is flagged as `is_staff: true` so the UI renders it with Kontafy branding. Customer replies use `POST /support/tickets/:id/messages` instead.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: { type: 'string', example: 'Thanks for the details, we are looking into it.' },
      },
    },
  })
  async replyAsStaff(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { body: string },
  ) {
    return this.supportService.addMessage(
      id,
      { userId: user.sub, isSuperadmin: true },
      body.body,
    );
  }
}
