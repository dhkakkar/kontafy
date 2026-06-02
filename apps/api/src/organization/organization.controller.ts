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
  @ApiOperation({ summary: 'List organizations for the current user' })
  async list(@CurrentUser() user: CurrentUserPayload) {
    return this.orgService.listByUser(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
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
  @ApiOperation({ summary: 'Get organization details' })
  @ApiSecurity('org-id')
  async findOne(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.orgService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update organization' })
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
  @ApiOperation({ summary: 'List organization members' })
  @ApiSecurity('org-id')
  async listMembers(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.orgService.listMembers(id, userId);
  }

  @Post(':id/members')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Invite a member to the organization' })
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
  @ApiOperation({ summary: 'Update member role/permissions' })
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
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiSecurity('org-id')
  async removeMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.orgService.removeMember(orgId, memberId);
  }
}
