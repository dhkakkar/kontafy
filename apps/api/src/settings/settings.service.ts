import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
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

  // ───────────────────────────────────────────────────────
  // Organization Settings
  // ───────────────────────────────────────────────────────

  async getOrganization(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganization(
    orgId: string,
    userId: string,
    data: {
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
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return org;
  }

  // ───────────────────────────────────────────────────────
  // Team / User Management
  // ───────────────────────────────────────────────────────

  async listMembers(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const members = await this.prisma.orgMember.findMany({
      where: { org_id: orgId },
      orderBy: { joined_at: 'asc' },
    });

    // Fetch user details from Supabase for each member
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        try {
          const { data } = await this.supabase.auth.admin.getUserById(member.user_id);
          return {
            id: member.id,
            user_id: member.user_id,
            role: member.role,
            permissions: member.permissions,
            joined_at: member.joined_at,
            name: data?.user?.user_metadata?.name || null,
            email: data?.user?.email || null,
            phone: data?.user?.phone || null,
          };
        } catch {
          return {
            id: member.id,
            user_id: member.user_id,
            role: member.role,
            permissions: member.permissions,
            joined_at: member.joined_at,
            name: null,
            email: null,
            phone: null,
          };
        }
      }),
    );

    return enrichedMembers;
  }

  async inviteUser(
    orgId: string,
    userId: string,
    data: { email: string; role: string },
  ) {
    await this.verifyMembership(orgId, userId);

    // Look up the user by email in Supabase
    const { data: usersData, error } = await this.supabase.auth.admin.listUsers();
    if (error) {
      throw new BadRequestException('Failed to look up user');
    }

    const targetUser = (usersData as any).users.find((u: any) => u.email === data.email);

    if (!targetUser) {
      // For now, throw an error. In production, you'd send an invitation email.
      throw new NotFoundException(
        'No user found with this email. They must sign up first.',
      );
    }

    // Check if already a member
    const existing = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: targetUser.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const member = await this.prisma.orgMember.create({
      data: {
        org_id: orgId,
        user_id: targetUser.id,
        role: data.role,
        permissions: {},
        invited_by: userId,
      },
    });

    return {
      ...member,
      name: targetUser.user_metadata?.name || null,
      email: targetUser.email,
    };
  }

  async updateMemberRole(
    orgId: string,
    memberId: string,
    data: { role: string },
  ) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, org_id: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Prevent changing the last owner
    if (member.role === 'owner' && data.role !== 'owner') {
      const ownerCount = await this.prisma.orgMember.count({
        where: { org_id: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot change role of the last owner');
      }
    }

    return this.prisma.orgMember.update({
      where: { id: memberId },
      data: { role: data.role },
    });
  }

  async removeMember(orgId: string, memberId: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { id: memberId, org_id: orgId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'owner') {
      const ownerCount = await this.prisma.orgMember.count({
        where: { org_id: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner');
      }
    }

    await this.prisma.orgMember.delete({ where: { id: memberId } });

    return { message: 'Member removed successfully' };
  }

  // ───────────────────────────────────────────────────────
  // Invoice Configuration
  // ───────────────────────────────────────────────────────

  async getInvoiceConfig(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const settings = (org.settings as Record<string, any>) || {};

    return {
      invoice_prefix: settings.invoice_prefix || 'INV-',
      next_invoice_number: settings.next_invoice_number || 1,
      default_payment_terms: settings.default_payment_terms || 30,
      default_terms_conditions: settings.default_terms_conditions || '',
      default_notes: settings.default_notes || '',
      bank_name: settings.bank_name || '',
      bank_account_number: settings.bank_account_number || '',
      bank_ifsc: settings.bank_ifsc || '',
      bank_branch: settings.bank_branch || '',
    };
  }

  async updateInvoiceConfig(
    orgId: string,
    userId: string,
    data: {
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
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const currentSettings = (org.settings as Record<string, any>) || {};
    const updatedSettings = { ...currentSettings, ...data };

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: updatedSettings,
        updated_at: new Date(),
      },
    });

    return this.getInvoiceConfig(orgId, userId);
  }

  // ───────────────────────────────────────────────────────
  // Tax / GST Settings
  // ───────────────────────────────────────────────────────

  async getTaxSettings(orgId: string, userId: string) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { gstin: true, pan: true, settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const settings = (org.settings as Record<string, any>) || {};

    return {
      gstin: org.gstin || '',
      pan: org.pan || '',
      gst_registration_type: settings.gst_registration_type || 'regular',
      filing_frequency: settings.filing_frequency || 'monthly',
      place_of_supply: settings.place_of_supply || '',
      enable_tds: settings.enable_tds || false,
      tds_tan: settings.tds_tan || '',
      default_tds_section: settings.default_tds_section || '',
    };
  }

  async updateTaxSettings(
    orgId: string,
    userId: string,
    data: {
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
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const currentSettings = (org.settings as Record<string, any>) || {};

    // Separate top-level fields from settings fields
    const topLevelData: Record<string, any> = {};
    const settingsData: Record<string, any> = {};

    if (data.gstin !== undefined) topLevelData.gstin = data.gstin;
    if (data.pan !== undefined) topLevelData.pan = data.pan;

    if (data.gst_registration_type !== undefined) settingsData.gst_registration_type = data.gst_registration_type;
    if (data.filing_frequency !== undefined) settingsData.filing_frequency = data.filing_frequency;
    if (data.place_of_supply !== undefined) settingsData.place_of_supply = data.place_of_supply;
    if (data.enable_tds !== undefined) settingsData.enable_tds = data.enable_tds;
    if (data.tds_tan !== undefined) settingsData.tds_tan = data.tds_tan;
    if (data.default_tds_section !== undefined) settingsData.default_tds_section = data.default_tds_section;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...topLevelData,
        settings: { ...currentSettings, ...settingsData },
        updated_at: new Date(),
      },
    });

    return this.getTaxSettings(orgId, userId);
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
