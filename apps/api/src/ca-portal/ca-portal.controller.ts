import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { CaPortalService, CaPermission } from './ca-portal.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('CA Portal')
@ApiBearerAuth('access-token')
@Controller('ca')
export class CaPortalController {
  constructor(private readonly caPortalService: CaPortalService) {}

  // ─── Invitation Management (Business Side) ─────────────────

  @Post('invite')
  @ApiSecurity('org-id')
  @ApiOperation({ summary: 'Invite a CA to access organization data' })
  async inviteCA(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { email: string; permissions: CaPermission[] },
  ) {
    return this.caPortalService.inviteCA(orgId, body.email, body.permissions, userId);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept a CA invitation' })
  async acceptInvite(
    @CurrentUser('sub') userId: string,
    @Body() body: { token: string },
  ) {
    return this.caPortalService.acceptInvite(body.token, userId);
  }

  @Delete('revoke/:userId')
  @ApiSecurity('org-id')
  @ApiOperation({ summary: 'Revoke CA access to organization' })
  async revokeAccess(
    @OrgId() orgId: string,
    @Param('userId') caUserId: string,
  ) {
    return this.caPortalService.revokeAccess(orgId, caUserId);
  }

  @Get('connected')
  @ApiSecurity('org-id')
  @ApiOperation({ summary: 'Get all CAs connected to this organization' })
  async getConnectedCAs(@OrgId() orgId: string) {
    return this.caPortalService.getConnectedCAs(orgId);
  }

  // ─── CA Client Views ────────────────────────────────────────

  @Get('clients')
  @ApiOperation({ summary: "Get all organizations this CA has access to" })
  async getClients(@CurrentUser('sub') userId: string) {
    return this.caPortalService.getCAClients(userId);
  }

  @Get('clients/:orgId/summary')
  @ApiOperation({ summary: 'Get client organization summary dashboard' })
  async getClientSummary(
    @Param('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.caPortalService.getClientData(orgId, userId);
  }

  @Get('clients/:orgId/export')
  @ApiOperation({ summary: 'Export annual data pack for a client' })
  @ApiQuery({ name: 'fy', required: true, description: 'Fiscal year, e.g. 2025-26' })
  async exportClientData(
    @Param('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Query('fy') fiscalYear: string,
  ) {
    return this.caPortalService.exportClientData(orgId, userId, fiscalYear);
  }

  // ─── Annotations ────────────────────────────────────────────

  @Post('annotations')
  @ApiOperation({ summary: 'Add a CA annotation on a financial entity' })
  async addAnnotation(
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      orgId: string;
      entityType: string;
      entityId: string;
      comment: string;
    },
  ) {
    return this.caPortalService.addAnnotation(
      body.orgId,
      userId,
      body.entityType,
      body.entityId,
      body.comment,
    );
  }

  @Get('annotations')
  @ApiOperation({ summary: 'List CA annotations' })
  @ApiQuery({ name: 'orgId', required: true })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  async getAnnotations(
    @CurrentUser('sub') userId: string,
    @Query('orgId') orgId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.caPortalService.getAnnotations(orgId, userId, entityType, entityId);
  }

  // ─── Approvals ──────────────────────────────────────────────

  @Get('approvals')
  @ApiOperation({ summary: 'Get pending journal entries awaiting CA approval' })
  @ApiQuery({ name: 'orgId', required: true })
  async getApprovalQueue(
    @CurrentUser('sub') userId: string,
    @Query('orgId') orgId: string,
  ) {
    return this.caPortalService.getApprovalQueue(orgId, userId);
  }

  @Post('approvals/:journalEntryId')
  @ApiOperation({ summary: 'Approve or reject a journal entry' })
  async approveEntry(
    @CurrentUser('sub') userId: string,
    @Param('journalEntryId') journalEntryId: string,
    @Body() body: { orgId: string; approved: boolean; comment?: string },
  ) {
    return this.caPortalService.approveEntry(
      body.orgId,
      userId,
      journalEntryId,
      body.approved,
      body.comment,
    );
  }
}
