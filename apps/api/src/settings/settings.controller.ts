import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { OrgId } from '../common/decorators/org-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';

@ApiTags('Settings')
@ApiBearerAuth('access-token')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ───────────────────────────────────────────────────────
  // Organization
  // ───────────────────────────────────────────────────────

  @Get('organization')
  @ApiOperation({ summary: 'Get organization profile' })
  @ApiSecurity('org-id')
  async getOrganization(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.getOrganization(orgId, userId);
  }

  @Patch('organization')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update organization profile' })
  @ApiSecurity('org-id')
  async updateOrganization(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      name?: string;
      legal_name?: string;
      gstin?: string;
      pan?: string;
      cin?: string;
      address?: Record<string, any>;
      phone?: string;
      email?: string;
      logo_url?: string;
      fiscal_year_start?: number;
      business_type?: string;
      industry?: string;
    },
  ) {
    return this.settingsService.updateOrganization(orgId, userId, body);
  }

  @Post('organization/logo')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Upload organization logo (data URL)' })
  @ApiSecurity('org-id')
  async uploadLogo(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { data_url: string },
  ) {
    return this.settingsService.uploadLogo(orgId, userId, body?.data_url);
  }

  // ───────────────────────────────────────────────────────
  // Team Members
  // ───────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List organization members with roles' })
  @ApiSecurity('org-id')
  async listMembers(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.listMembers(orgId, userId);
  }

  @Post('users/invite')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Invite user by email' })
  @ApiSecurity('org-id')
  async inviteUser(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { email: string; role: string },
  ) {
    return this.settingsService.inviteUser(orgId, userId, body);
  }

  @Patch('users/:id/role')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Change member role' })
  @ApiSecurity('org-id')
  async updateMemberRole(
    @OrgId() orgId: string,
    @Param('id') memberId: string,
    @Body() body: { role: string },
  ) {
    return this.settingsService.updateMemberRole(orgId, memberId, body);
  }

  @Delete('users/:id')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiSecurity('org-id')
  async removeMember(
    @OrgId() orgId: string,
    @Param('id') memberId: string,
  ) {
    return this.settingsService.removeMember(orgId, memberId);
  }

  // ───────────────────────────────────────────────────────
  // Invoice Configuration
  // ───────────────────────────────────────────────────────

  @Get('invoice-config')
  @ApiOperation({ summary: 'Get invoice numbering, prefix, terms, bank details' })
  @ApiSecurity('org-id')
  async getInvoiceConfig(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.getInvoiceConfig(orgId, userId);
  }

  @Patch('invoice-config')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin', 'accountant')
  @ApiOperation({ summary: 'Update invoice configuration' })
  @ApiSecurity('org-id')
  async updateInvoiceConfig(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      invoice_prefix?: string;
      next_invoice_number?: number;
      default_payment_terms?: number;
      default_terms_conditions?: string;
      default_notes?: string;
      bank_name?: string;
      bank_account_number?: string;
      bank_ifsc?: string;
      bank_branch?: string;
    },
  ) {
    return this.settingsService.updateInvoiceConfig(orgId, userId, body);
  }

  // ───────────────────────────────────────────────────────
  // Tax / GST Settings
  // ───────────────────────────────────────────────────────

  @Get('tax')
  @ApiOperation({ summary: 'Get tax/GST settings' })
  @ApiSecurity('org-id')
  async getTaxSettings(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.settingsService.getTaxSettings(orgId, userId);
  }

  @Patch('tax')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin', 'accountant')
  @ApiOperation({ summary: 'Update tax/GST settings' })
  @ApiSecurity('org-id')
  async updateTaxSettings(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      gstin?: string;
      pan?: string;
      gst_registration_type?: string;
      filing_frequency?: string;
      place_of_supply?: string;
      enable_tds?: boolean;
      tds_tan?: string;
      default_tds_section?: string;
    },
  ) {
    return this.settingsService.updateTaxSettings(orgId, userId, body);
  }
}
