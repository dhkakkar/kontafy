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
  @ApiOperation({ summary: 'Platform dashboard stats' })
  async getDashboard() {
    return this.service.getDashboard();
  }

  // ── Organizations ──────────────────────────────────────────

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations' })
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
  @ApiOperation({ summary: 'Create organization with specified owner' })
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
  @ApiOperation({ summary: 'Get organization detail' })
  async getOrganization(@Param('id') id: string) {
    return this.service.getOrganization(id);
  }

  @Patch('organizations/:id')
  @ApiOperation({ summary: 'Update organization' })
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
  @ApiOperation({ summary: 'Activate or deactivate organization' })
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
  })
  async seedOrgAccounts(@Param('id') id: string) {
    return this.service.seedOrgAccounts(id);
  }

  @Post('organizations/:id/backfill-journals')
  @ApiOperation({
    summary:
      'Backfill journal entries for invoices and payments that were created before auto-posting was wired in',
  })
  async backfillJournals(@Param('id') id: string) {
    return this.service.backfillJournals(id);
  }

  @Delete('organizations/:id')
  @ApiOperation({ summary: 'Delete organization' })
  async deleteOrganization(@Param('id') id: string) {
    return this.service.deleteOrganization(id);
  }

  // ── Users ──────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all platform users' })
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
  @ApiOperation({ summary: 'Get user detail' })
  async getUser(@Param('id') id: string) {
    return this.service.getUser(id);
  }

  // ── Superadmins ────────────────────────────────────────────

  @Get('admins')
  @ApiOperation({ summary: 'List all superadmins' })
  async listSuperadmins() {
    return this.service.listSuperadmins();
  }

  @Post('admins')
  @ApiOperation({ summary: 'Grant superadmin to a user' })
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
  @ApiOperation({ summary: 'Revoke superadmin from a user' })
  async revokeSuperadmin(@Param('userId') userId: string) {
    return this.service.revokeSuperadmin(userId);
  }

  // ── Audit Log ──────────────────────────────────────────────

  @Get('audit-log')
  @ApiOperation({ summary: 'Platform-wide audit log' })
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
  @ApiOperation({ summary: 'List all support tickets across the platform' })
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
  @ApiOperation({ summary: 'Get ticket detail with full message thread' })
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
  @ApiOperation({ summary: 'Update ticket status / priority / assignee' })
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
  @ApiOperation({ summary: 'Reply on a ticket as staff' })
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
