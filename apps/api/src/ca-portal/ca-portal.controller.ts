import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Invite a CA to access organization data',
    description:
      'Sends an email invitation to a Chartered Accountant offering scoped, read-only (or annotation/approval) access to this organization\'s books. `permissions` is a string array of capability flags (e.g. `read_journals`, `approve_entries`). The CA must accept via `POST /ca/accept-invite` before any access is granted.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'permissions'],
      properties: {
        email: { type: 'string', format: 'email', example: 'ca@example.com' },
        permissions: {
          type: 'array',
          items: { type: 'string', example: 'read_journals' },
        },
      },
    },
  })
  async inviteCA(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { email: string; permissions: CaPermission[] },
  ) {
    return this.caPortalService.inviteCA(orgId, body.email, body.permissions, userId);
  }

  @Post('accept-invite')
  @ApiOperation({
    summary: 'Accept a CA invitation',
    description:
      'Called by the CA (logged into their own Kontafy account) to consume the single-use invite token. On success the CA is linked to the inviting organization with the permissions specified in the invite, and the org appears in `GET /ca/clients`.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', description: 'Invitation token from the CA invite email' },
      },
    },
  })
  async acceptInvite(
    @CurrentUser('sub') userId: string,
    @Body() body: { token: string },
  ) {
    return this.caPortalService.acceptInvite(body.token, userId);
  }

  @Delete('revoke/:userId')
  @ApiSecurity('org-id')
  @ApiOperation({
    summary: 'Revoke CA access to organization',
    description:
      'Immediately terminates a CA\'s access to this organization. The CA can no longer fetch client data or post annotations / approvals. Existing annotations and approval history are preserved for audit.',
  })
  async revokeAccess(
    @OrgId() orgId: string,
    @Param('userId') caUserId: string,
  ) {
    return this.caPortalService.revokeAccess(orgId, caUserId);
  }

  @Get('connected')
  @ApiSecurity('org-id')
  @ApiOperation({
    summary: 'Get all CAs connected to this organization',
    description:
      'Returns every CA currently linked to this org with their name, email, granted permissions, and connection date. Used by the business owner\'s "CA Access" settings page.',
  })
  async getConnectedCAs(@OrgId() orgId: string) {
    return this.caPortalService.getConnectedCAs(orgId);
  }

  // ─── CA Client Views ────────────────────────────────────────

  @Get('clients')
  @ApiOperation({
    summary: "Get all organizations this CA has access to",
    description:
      'Returns the list of client organizations the authenticated CA can view, each with the org name, the permissions granted, and high-level KPIs for the CA portal landing page. Note: this endpoint is CA-scoped — it does not require the `X-Org-Id` header.',
  })
  async getClients(@CurrentUser('sub') userId: string) {
    return this.caPortalService.getCAClients(userId);
  }

  @Get('clients/:orgId/summary')
  @ApiOperation({
    summary: 'Get client organization summary dashboard',
    description:
      'Returns the CA dashboard view of a single client — financial summaries, GST filings status, pending approvals, and recent activity. Access is gated by the CA-org link; calling for an org the CA is not connected to returns 403.',
  })
  async getClientSummary(
    @Param('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.caPortalService.getClientData(orgId, userId);
  }

  @Get('clients/:orgId/export')
  @ApiOperation({
    summary: 'Export annual data pack for a client',
    description:
      'Builds a year-end data pack (P&L, balance sheet, trial balance, ledger dumps, GST summaries) for the supplied `fy` and returns the bundle for the CA to file with the authorities. The CA must have `export_data` permission on the client org.',
  })
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
  @ApiOperation({
    summary: 'Add a CA annotation on a financial entity',
    description:
      'Lets the CA pin a comment to any entity in the client\'s books (journal entry, invoice, expense, etc.). Annotations are visible to the business owner and show up on the related entity\'s detail page, providing a lightweight feedback channel without modifying the underlying record.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orgId', 'entityType', 'entityId', 'comment'],
      properties: {
        orgId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        entityType: { type: 'string', example: 'journal_entry' },
        entityId: { type: 'string', format: 'uuid', example: '11111111-2222-3333-4444-555555555555' },
        comment: { type: 'string', example: 'Please reclassify under utilities.' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'List CA annotations',
    description:
      'Returns CA annotations for the supplied `orgId`. Optionally narrow by `entityType` (e.g. journal_entry) and `entityId` to fetch comments for a single document. Each result includes the author CA, timestamp, and comment body.',
  })
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
  @ApiOperation({
    summary: 'Get pending journal entries awaiting CA approval',
    description:
      'Returns the journal entries flagged for CA review in the supplied `orgId`. Each row includes the entry header, lines, and the user who submitted it — feeds the CA portal\'s approval queue UI.',
  })
  @ApiQuery({ name: 'orgId', required: true })
  async getApprovalQueue(
    @CurrentUser('sub') userId: string,
    @Query('orgId') orgId: string,
  ) {
    return this.caPortalService.getApprovalQueue(orgId, userId);
  }

  @Post('approvals/:journalEntryId')
  @ApiOperation({
    summary: 'Approve or reject a journal entry',
    description:
      'Records the CA\'s decision on a pending journal entry. `approved: true` transitions the entry to approved (and posts it if the org\'s workflow requires CA sign-off); `approved: false` flags it back to the submitter as rejected. The optional `comment` is stored as an annotation and surfaced to the owner.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orgId', 'approved'],
      properties: {
        orgId: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        approved: { type: 'boolean', example: true },
        comment: { type: 'string', example: 'Approved after verification.' },
      },
    },
  })
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
