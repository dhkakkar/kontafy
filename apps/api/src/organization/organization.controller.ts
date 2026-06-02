import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { OrgId } from '../common/decorators/org-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';

@ApiTags('Organizations')
@ApiBearerAuth('access-token')
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @ApiOperation({
    summary: 'List organizations for the current user',
    description:
      'Returns every organization the authenticated user is a member of along with their role in each. The result also drives the org-switcher in the UI — pick one id and pass it as `X-Org-Id` on subsequent requests to scope data access.',
  })
  async list(@CurrentUser() user: CurrentUserPayload) {
    return this.orgService.listByUser(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new organization',
    description:
      'Provisions a fresh organization with the caller as the `owner` member. As part of bootstrap the default chart of accounts is seeded and a starter subscription record is created. The returned `id` should be used as `X-Org-Id` on subsequent calls.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Acme Pvt Ltd' },
        legal_name: { type: 'string', example: 'Acme Private Limited' },
        gstin: { type: 'string', example: '29ABCDE1234F1Z5' },
        pan: { type: 'string', example: 'ABCDE1234F' },
        business_type: { type: 'string', example: 'Private Limited' },
        industry: { type: 'string', example: 'Technology' },
        address: { type: 'object', additionalProperties: true },
        phone: { type: 'string', example: '+919876543210' },
        email: { type: 'string', format: 'email', example: 'contact@acme.com' },
      },
    },
  })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      legal_name?: string;
      gstin?: string;
      pan?: string;
      business_type?: string;
      industry?: string;
      address?: Record<string, any>;
      phone?: string;
      email?: string;
    },
  ) {
    return this.orgService.create(user.sub, body);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get organization details',
    description:
      'Returns the full organization record including legal identifiers (GSTIN, PAN, CIN), address, and the `settings` JSON blob. The caller must be a member of the org — otherwise a 403 is returned.',
  })
  @ApiSecurity('org-id')
  async findOne(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.orgService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Update organization',
    description:
      'Patches identity, contact and settings fields on the organization. Only `owner` and `admin` members may call this. Most invoice-config and tax-specific edits should go through `PATCH /settings/*` instead — this endpoint is the low-level escape hatch.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Acme Pvt Ltd' },
        legal_name: { type: 'string', example: 'Acme Private Limited' },
        gstin: { type: 'string', example: '29ABCDE1234F1Z5' },
        pan: { type: 'string', example: 'ABCDE1234F' },
        cin: { type: 'string', example: 'U72200KA2010PTC053718' },
        business_type: { type: 'string', example: 'Private Limited' },
        industry: { type: 'string', example: 'Technology' },
        address: { type: 'object', additionalProperties: true },
        phone: { type: 'string', example: '+919876543210' },
        email: { type: 'string', format: 'email', example: 'contact@acme.com' },
        logo_url: { type: 'string', format: 'uri', example: 'https://cdn.kontafy.com/logos/abc.png' },
        settings: { type: 'object', additionalProperties: true },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      name?: string;
      legal_name?: string;
      gstin?: string;
      pan?: string;
      cin?: string;
      business_type?: string;
      industry?: string;
      address?: Record<string, any>;
      phone?: string;
      email?: string;
      logo_url?: string;
      settings?: Record<string, any>;
    },
  ) {
    return this.orgService.update(id, userId, body);
  }

  @Get(':id/members')
  @ApiOperation({
    summary: 'List organization members',
    description:
      'Returns every user attached to the org with their role and any custom permissions. Useful for rendering the team/people page and for client-side role-gating decisions.',
  })
  @ApiSecurity('org-id')
  async listMembers(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.orgService.listMembers(id, userId);
  }

  @Post(':id/members')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Invite a member to the organization',
    description:
      'Adds an existing platform user to the org with the given role and optional permission overrides. The target user must already have a Kontafy account — for email-first onboarding use `POST /settings/users/invite` instead, which sends a sign-up link.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['user_id', 'role'],
      properties: {
        user_id: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        role: { type: 'string', example: 'accountant' },
        permissions: { type: 'object', additionalProperties: true },
      },
    },
  })
  async inviteMember(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { user_id: string; role: string; permissions?: Record<string, any> },
  ) {
    return this.orgService.addMember(id, userId, body);
  }

  @Patch(':id/members/:memberId')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Update member role/permissions',
    description:
      'Changes a member\'s role (e.g. promote `accountant` to `admin`) or overrides the default permission set for the role. Demoting the last `owner` is rejected — every org must keep at least one owner.',
  })
  @ApiSecurity('org-id')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', example: 'admin' },
        permissions: { type: 'object', additionalProperties: true },
      },
    },
  })
  async updateMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() body: { role?: string; permissions?: Record<string, any> },
  ) {
    return this.orgService.updateMember(orgId, memberId, body);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Remove member from organization',
    description:
      'Detaches the user from this org without deleting their platform account. The user immediately loses access to org-scoped data on their next request. Owners cannot be removed — transfer ownership via `PATCH /organizations/:id/members/:memberId` first.',
  })
  @ApiSecurity('org-id')
  async removeMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.orgService.removeMember(orgId, memberId);
  }
}
