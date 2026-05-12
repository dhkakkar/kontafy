import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationService } from '../organization/organization.service';
import { JournalPostingService } from '../books/journal-posting/journal-posting.service';

const BCRYPT_COST = 10;

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orgService: OrganizationService,
    private readonly journalPosting: JournalPostingService,
  ) {}

  /**
   * Platform dashboard stats.
   */
  async getDashboard() {
    const [
      totalOrgs,
      totalMembers,
      totalInvoices,
      totalContacts,
      totalPayments,
      recentOrgs,
      planBreakdown,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.orgMember.count(),
      this.prisma.invoice.count(),
      this.prisma.contact.count(),
      this.prisma.payment.count(),
      this.prisma.organization.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { id: true, name: true, plan: true, created_at: true },
      }),
      this.prisma.organization.groupBy({
        by: ['plan'],
        _count: true,
      }),
    ]);

    const revenueResult = await this.prisma.invoice.aggregate({
      _sum: { total: true },
      where: { status: { in: ['sent', 'paid', 'partially_paid', 'overdue'] } },
    });

    return {
      stats: {
        total_organizations: totalOrgs,
        total_users: totalMembers,
        total_invoices: totalInvoices,
        total_contacts: totalContacts,
        total_payments: totalPayments,
        total_revenue: Number(revenueResult._sum.total || 0),
      },
      recent_organizations: recentOrgs,
      plan_breakdown: planBreakdown.map((p) => ({
        plan: p.plan,
        count: p._count,
      })),
    };
  }

  /**
   * List all organizations with pagination and search.
   */
  async listOrganizations(params: {
    page?: number;
    limit?: number;
    search?: string;
    plan?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { gstin: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.plan) {
      where.plan = params.plan;
    }

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              members: true,
              invoices: true,
              contacts: true,
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get organization detail with members.
   */
  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: true,
        _count: {
          select: {
            invoices: true,
            contacts: true,
            payments: true,
            products: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  /**
   * Create an organization and assign an owner.
   *
   * Two ways to pick the owner:
   * - `owner_email` + `owner_password` (+ optional `owner_full_name`): if no
   *   user with that email exists, create one with the given password. If a
   *   user already exists, link them as owner (their password is unchanged).
   * - `owner_user_id`: directly use an existing user by id.
   */
  async createOrganization(data: {
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
  }) {
    let ownerUserId: string;
    let ownerEmailOnRecord: string | undefined;

    if (data.owner_user_id) {
      const existing = await this.prisma.user.findUnique({
        where: { id: data.owner_user_id },
      });
      if (!existing) {
        throw new NotFoundException('Owner user not found');
      }
      ownerUserId = existing.id;
      ownerEmailOnRecord = existing.email;
    } else if (data.owner_email) {
      const email = data.owner_email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        ownerUserId = existing.id;
        ownerEmailOnRecord = existing.email;
      } else {
        if (!data.owner_password || data.owner_password.length < 8) {
          throw new BadRequestException(
            'A password of at least 8 characters is required to create a new owner account.',
          );
        }
        const password_hash = await bcrypt.hash(data.owner_password, BCRYPT_COST);
        const created = await this.prisma.user.create({
          data: {
            email,
            password_hash,
            name: data.owner_full_name || null,
            email_verified: true,
          },
        });
        ownerUserId = created.id;
        ownerEmailOnRecord = created.email;
      }
    } else {
      throw new BadRequestException(
        'Either owner_email or owner_user_id must be provided.',
      );
    }

    const org = await this.prisma.organization.create({
      data: {
        name: data.name,
        legal_name: data.legal_name || undefined,
        gstin: data.gstin || undefined,
        pan: data.pan || undefined,
        email: data.email || ownerEmailOnRecord || undefined,
        phone: data.phone || undefined,
        business_type: data.business_type || undefined,
        industry: data.industry || undefined,
        plan: data.plan || 'starter',
        fiscal_year_start: data.fiscal_year_start ?? 4,
      },
    });

    await this.prisma.orgMember.create({
      data: {
        org_id: org.id,
        user_id: ownerUserId,
        role: 'owner',
      },
    });

    try {
      await this.orgService.seedDefaultAccounts(org.id);
    } catch (err) {
      this.logger.error(
        `Failed to seed default accounts for org ${org.id}`,
        err,
      );
    }

    return org;
  }

  async updateOrganization(
    id: string,
    data: { name?: string; plan?: string; settings?: any },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async seedOrgAccounts(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return this.orgService.seedDefaultAccounts(orgId);
  }

  async backfillJournals(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return this.journalPosting.backfillOrg(orgId);
  }

  async setOrganizationStatus(
    id: string,
    data: { is_active: boolean; reason?: string },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        is_active: data.is_active,
        deactivated_at: data.is_active ? null : new Date(),
        deactivation_reason: data.is_active ? null : data.reason || null,
      },
    });
  }

  async deleteOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.organization.delete({ where: { id } });
    return { message: `Organization "${org.name}" deleted successfully` };
  }

  /**
   * List users with their org memberships.
   */
  async listUsers(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    const memberships = await this.prisma.orgMember.findMany({
      where: { user_id: { in: userIds } },
      include: { organization: { select: { id: true, name: true } } },
    });
    const superadmins = await this.prisma.superadmin.findMany({
      where: { user_id: { in: userIds } },
    });
    const superadminSet = new Set(superadmins.map((s) => s.user_id));

    const membershipMap = new Map<string, any[]>();
    for (const m of memberships) {
      if (!membershipMap.has(m.user_id)) membershipMap.set(m.user_id, []);
      membershipMap.get(m.user_id)!.push({
        org_id: m.organization.id,
        org_name: m.organization.name,
        role: m.role,
      });
    }

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        full_name: u.name || '',
        created_at: u.created_at,
        last_sign_in_at: null,
        is_superadmin: superadminSet.has(u.id),
        organizations: membershipMap.get(u.id) || [],
      })),
      meta: { total, page, limit },
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const memberships = await this.prisma.orgMember.findMany({
      where: { user_id: userId },
      include: {
        organization: {
          select: { id: true, name: true, plan: true, gstin: true },
        },
      },
    });

    const superadmin = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      full_name: user.name || '',
      created_at: user.created_at,
      last_sign_in_at: null,
      is_superadmin: !!superadmin,
      organizations: memberships.map((m) => ({
        org_id: m.organization.id,
        org_name: m.organization.name,
        plan: m.organization.plan,
        gstin: m.organization.gstin,
        role: m.role,
        joined_at: m.joined_at,
      })),
    };
  }

  async listSuperadmins() {
    const superadmins = await this.prisma.superadmin.findMany({
      orderBy: { created_at: 'asc' },
    });

    const userIds = superadmins.map((s) => s.user_id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return superadmins.map((sa) => {
      const u = userMap.get(sa.user_id);
      return {
        ...sa,
        email: u?.email || 'unknown',
        full_name: u?.name || '',
      };
    });
  }

  async grantSuperadmin(userId: string, grantedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });
    if (existing) {
      throw new ConflictException('User is already a superadmin');
    }

    const superadmin = await this.prisma.superadmin.create({
      data: { user_id: userId, granted_by: grantedBy },
    });

    return { ...superadmin, email: user.email };
  }

  async revokeSuperadmin(userId: string) {
    const existing = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User is not a superadmin');
    }

    const count = await this.prisma.superadmin.count();
    if (count <= 1) {
      throw new BadRequestException(
        'Cannot revoke the last superadmin. Grant another user first.',
      );
    }

    await this.prisma.superadmin.delete({ where: { user_id: userId } });
    return { message: 'Superadmin access revoked' };
  }

  async getAuditLog(params: { page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
