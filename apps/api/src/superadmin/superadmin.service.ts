import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL', ''),
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY', ''),
    );
  }

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

    // Get total revenue from all invoices
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
   * Supports two modes of picking the owner:
   * - `owner_email` + `owner_password` (+ optional `owner_full_name`): if a
   *   Supabase Auth user with that email doesn't exist, one is created with
   *   the given password (email auto-confirmed). If a user already exists
   *   with that email, it is linked as the owner (password is ignored —
   *   the existing account is not modified).
   * - `owner_user_id`: legacy — directly use an existing Supabase user by id.
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
    // Resolve owner user_id from either mode.
    let ownerUserId: string;
    let ownerEmailOnRecord: string | undefined;

    if (data.owner_user_id) {
      const { data: userData, error } =
        await this.supabase.auth.admin.getUserById(data.owner_user_id);
      if (error || !userData.user) {
        throw new NotFoundException('Owner user not found in auth system');
      }
      ownerUserId = userData.user.id;
      ownerEmailOnRecord = userData.user.email;
    } else if (data.owner_email) {
      const email = data.owner_email.trim().toLowerCase();
      const existing = await this.findUserByEmail(email);
      if (existing) {
        ownerUserId = existing.id;
        ownerEmailOnRecord = existing.email;
      } else {
        if (!data.owner_password || data.owner_password.length < 8) {
          throw new BadRequestException(
            'A password of at least 8 characters is required to create a new owner account.',
          );
        }
        const { data: created, error } =
          await this.supabase.auth.admin.createUser({
            email,
            password: data.owner_password,
            email_confirm: true,
            user_metadata: data.owner_full_name
              ? { full_name: data.owner_full_name }
              : {},
          });
        if (error || !created?.user) {
          throw new BadRequestException(
            `Failed to create owner account: ${error?.message || 'unknown error'}`,
          );
        }
        ownerUserId = created.user.id;
        ownerEmailOnRecord = created.user.email;
      }
    } else {
      throw new BadRequestException(
        'Either owner_email or owner_user_id must be provided.',
      );
    }

    // Create organization
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

    // Create owner membership
    await this.prisma.orgMember.create({
      data: {
        org_id: org.id,
        user_id: ownerUserId,
        role: 'owner',
      },
    });

    return org;
  }

  /**
   * Scan Supabase Auth users for a given email. Paginated — stops at the
   * first match. Returns null if the email doesn't belong to any user.
   */
  private async findUserByEmail(email: string) {
    const target = email.toLowerCase();
    const perPage = 200;
    let page = 1;
    // Hard cap at 10 pages (2000 users) — well beyond any realistic platform
    // size that'd hit this path without a dedicated lookup endpoint.
    while (page <= 10) {
      const { data, error } = await this.supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        throw new BadRequestException(
          `Failed to look up owner by email: ${error.message}`,
        );
      }
      const match = data.users.find(
        (u) => u.email?.toLowerCase() === target,
      );
      if (match) return match;
      if (data.users.length < perPage) return null;
      page += 1;
    }
    return null;
  }

  /**
   * Update any organization.
   */
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

  /**
   * Activate or deactivate an organization.
   * Deactivated orgs can't be accessed by their members (except superadmins).
   */
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

  /**
   * Delete an organization and all its data.
   */
  async deleteOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.organization.delete({ where: { id } });
    return { message: `Organization "${org.name}" deleted successfully` };
  }

  /**
   * List all users from Supabase with their org memberships.
   */
  async listUsers(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    try {
      const { data, error } = await this.supabase.auth.admin.listUsers({
        page,
        perPage: limit,
      });

      if (error) {
        throw new BadRequestException(`Failed to list users: ${error.message}`);
      }

      // Get all org memberships for these users
      const userIds = data.users.map((u) => u.id);
      const memberships = await this.prisma.orgMember.findMany({
        where: { user_id: { in: userIds } },
        include: { organization: { select: { id: true, name: true } } },
      });

      // Get superadmin statuses
      const superadmins = await this.prisma.superadmin.findMany({
        where: { user_id: { in: userIds } },
      });
      const superadminSet = new Set(superadmins.map((s) => s.user_id));

      const membershipMap = new Map<string, any[]>();
      for (const m of memberships) {
        if (!membershipMap.has(m.user_id)) {
          membershipMap.set(m.user_id, []);
        }
        membershipMap.get(m.user_id)!.push({
          org_id: m.organization.id,
          org_name: m.organization.name,
          role: m.role,
        });
      }

      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        is_superadmin: superadminSet.has(u.id),
        organizations: membershipMap.get(u.id) || [],
      }));

      return {
        data: users,
        meta: {
          total: (data as any).total || users.length,
          page,
          limit,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to list users', error);
      throw new BadRequestException('Failed to list users');
    }
  }

  /**
   * Get user detail.
   */
  async getUser(userId: string) {
    try {
      const { data, error } = await this.supabase.auth.admin.getUserById(userId);
      if (error || !data.user) {
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
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        full_name:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          '',
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at,
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
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error('Failed to get user', error);
      throw new BadRequestException('Failed to get user');
    }
  }

  /**
   * List all superadmins.
   */
  async listSuperadmins() {
    const superadmins = await this.prisma.superadmin.findMany({
      orderBy: { created_at: 'asc' },
    });

    // Enrich with user info from Supabase
    const enriched = await Promise.all(
      superadmins.map(async (sa) => {
        try {
          const { data } = await this.supabase.auth.admin.getUserById(
            sa.user_id,
          );
          return {
            ...sa,
            email: data.user?.email || 'unknown',
            full_name:
              data.user?.user_metadata?.full_name ||
              data.user?.user_metadata?.name ||
              '',
          };
        } catch {
          return { ...sa, email: 'unknown', full_name: '' };
        }
      }),
    );

    return enriched;
  }

  /**
   * Grant superadmin to a user.
   */
  async grantSuperadmin(userId: string, grantedBy: string) {
    // Verify user exists in Supabase
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);
    if (error || !data.user) {
      throw new NotFoundException('User not found in auth system');
    }

    const existing = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });
    if (existing) {
      throw new BadRequestException('User is already a superadmin');
    }

    const superadmin = await this.prisma.superadmin.create({
      data: {
        user_id: userId,
        granted_by: grantedBy,
      },
    });

    return {
      ...superadmin,
      email: data.user.email,
    };
  }

  /**
   * Revoke superadmin from a user.
   */
  async revokeSuperadmin(userId: string) {
    const existing = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User is not a superadmin');
    }

    // Prevent revoking the last superadmin
    const count = await this.prisma.superadmin.count();
    if (count <= 1) {
      throw new BadRequestException(
        'Cannot revoke the last superadmin. Grant another user first.',
      );
    }

    await this.prisma.superadmin.delete({ where: { user_id: userId } });
    return { message: 'Superadmin access revoked' };
  }

  /**
   * Platform-wide audit log.
   */
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
