import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrgId } from '../common/decorators/org-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ───────────────────────────────────────────────────────
  // Paginated audit log with filters
  // ───────────────────────────────────────────────────────

  @Get()
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get paginated audit log with filters' })
  @ApiSecurity('org-id')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  async getAuditLog(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') filterUserId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.getAuditLog(orgId, userId, {
      page,
      limit,
      startDate,
      endDate,
      userId: filterUserId,
      entityType,
      action,
    });
  }

  // ───────────────────────────────────────────────────────
  // Filter options (distinct values for dropdowns)
  // ───────────────────────────────────────────────────────

  @Get('filters')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get filter options for audit log' })
  @ApiSecurity('org-id')
  async getFilterOptions(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.auditService.getFilterOptions(orgId, userId);
  }

  // ───────────────────────────────────────────────────────
  // Export audit log as CSV
  // ───────────────────────────────────────────────────────

  @Get('export')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Export audit log as CSV' })
  @ApiSecurity('org-id')
  async exportAuditLog(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') filterUserId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    const csv = await this.auditService.exportAuditLog(orgId, userId, {
      startDate,
      endDate,
      userId: filterUserId,
      entityType,
      action,
    });

    const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ───────────────────────────────────────────────────────
  // Entity history
  // ───────────────────────────────────────────────────────

  @Get(':entityType/:entityId')
  @UseGuards(RoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get full audit history for a specific entity' })
  @ApiSecurity('org-id')
  async getEntityHistory(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(orgId, userId, entityType, entityId);
  }
}
