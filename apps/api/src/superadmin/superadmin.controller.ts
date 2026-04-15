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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SuperadminGuard } from '../common/guards/superadmin.guard';
import { SuperadminOnly } from '../common/decorators/superadmin.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SuperadminService } from './superadmin.service';

@ApiTags('Superadmin')
@Controller('superadmin')
@UseGuards(SuperadminGuard)
@SuperadminOnly()
export class SuperadminController {
  constructor(private readonly service: SuperadminService) {}

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
  async createOrganization(
    @Body() body: { name: string; owner_user_id: string },
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
  async updateOrganization(
    @Param('id') id: string,
    @Body() body: { name?: string; plan?: string; settings?: any },
  ) {
    return this.service.updateOrganization(id, body);
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
}
