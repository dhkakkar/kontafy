import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntry {
  orgId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  entityType?: string;
  action?: string;
  entityId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────
  // Log an audit entry
  // ───────────────────────────────────────────────────────

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          org_id: entry.orgId,
          user_id: entry.userId,
          action: entry.action,
          entity_type: entry.entityType || null,
          entity_id: entry.entityId || null,
          changes: entry.changes
            ? { ...entry.changes, ...(entry.metadata || {}) }
            : entry.metadata || null,
          ip_address: entry.ipAddress || null,
        },
      });
    } catch (error) {
      // Audit logging should never break the main request flow
      this.logger.error('Failed to create audit log entry', error);
    }
  }

  // ───────────────────────────────────────────────────────
  // Get paginated audit log with filters
  // ───────────────────────────────────────────────────────

  async getAuditLog(orgId: string, userId: string, filters: AuditLogFilters) {
    await this.verifyMembership(orgId, userId);

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };

    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Include the full end date day
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    if (filters.userId) {
      where.user_id = filters.userId;
    }

    if (filters.entityType) {
      where.entity_type = filters.entityType;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityId) {
      where.entity_id = filters.entityId;
    }

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: entries,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ───────────────────────────────────────────────────────
  // Get full history for a specific entity
  // ───────────────────────────────────────────────────────

  async getEntityHistory(
    orgId: string,
    userId: string,
    entityType: string,
    entityId: string,
  ) {
    await this.verifyMembership(orgId, userId);

    const entries = await this.prisma.auditLog.findMany({
      where: {
        org_id: orgId,
        entity_type: entityType,
        entity_id: entityId,
      },
      orderBy: { created_at: 'desc' },
    });

    return entries;
  }

  // ───────────────────────────────────────────────────────
  // Get distinct values for filter dropdowns
  // ───────────────────────────────────────────────────────

  async getFilterOptions(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const [entityTypes, actions, userIds] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { org_id: orgId, entity_type: { not: null } },
        distinct: ['entity_type'],
        select: { entity_type: true },
      }),
      this.prisma.auditLog.findMany({
        where: { org_id: orgId },
        distinct: ['action'],
        select: { action: true },
      }),
      this.prisma.auditLog.findMany({
        where: { org_id: orgId, user_id: { not: null } },
        distinct: ['user_id'],
        select: { user_id: true },
      }),
    ]);

    return {
      entityTypes: entityTypes
        .map((e) => e.entity_type)
        .filter(Boolean) as string[],
      actions: actions.map((a) => a.action),
      userIds: userIds
        .map((u) => u.user_id)
        .filter(Boolean) as string[],
    };
  }

  // ───────────────────────────────────────────────────────
  // Export audit log as CSV data
  // ───────────────────────────────────────────────────────

  async exportAuditLog(orgId: string, userId: string, filters: AuditLogFilters) {
    await this.verifyMembership(orgId, userId);

    const where: any = { org_id: orgId };

    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    if (filters.userId) where.user_id = filters.userId;
    if (filters.entityType) where.entity_type = filters.entityType;
    if (filters.action) where.action = filters.action;

    const entries = await this.prisma.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 10000, // Safety cap
    });

    // Build CSV
    const headers = [
      'Timestamp',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Changes',
      'IP Address',
    ];

    const rows = entries.map((entry) => [
      entry.created_at.toISOString(),
      entry.user_id || '',
      entry.action,
      entry.entity_type || '',
      entry.entity_id || '',
      entry.changes ? JSON.stringify(entry.changes) : '',
      entry.ip_address || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    return csvContent;
  }

  // ───────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────

  private async verifyMembership(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return member;
  }
}
