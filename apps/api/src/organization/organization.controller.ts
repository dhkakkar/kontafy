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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
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

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
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
