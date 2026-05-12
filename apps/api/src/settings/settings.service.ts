import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  private readonly s3: S3Client;
  private readonly bucket = 'syscode-uploads';
  private readonly keyPrefix = 'kontafy/logos';
  private readonly publicBaseUrl = 'https://pub-3c9b20f24ae34d4d935610c014f9ba51.r2.dev';

  constructor(private readonly prisma: PrismaService) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://08c5215e60e39dc2fbb3fb67ae7359a5.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '0bd5fa4925a7b2172467c4b1976bb65a',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'ada1bfa44238f83b2097bb6b23d7ed17594bf46c62bdbbcba3e8ec00e6b40bcd',
      },
      forcePathStyle: true,
    });
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

  /**
   * Upload an organization logo. Takes a data URL from the client,
   * validates, uploads to the Cloudflare R2 `syscode-uploads` bucket
   * under `kontafy/logos/`, and stores the public URL on
   * Organization.logo_url. Returns the saved URL.
   */
  async uploadLogo(orgId: string, userId: string, dataUrl: string) {
    await this.verifyMembership(orgId, userId);

    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new BadRequestException('Image data is required');
    }

    const match = /^data:(image\/(png|jpeg|jpg|webp|svg\+xml));base64,(.+)$/i.exec(
      dataUrl,
    );
    if (!match) {
      throw new BadRequestException(
        'Invalid image data. Expected a PNG, JPEG, WEBP, or SVG data URL.',
      );
    }
    const mime = match[1].toLowerCase();
    const rawExt = match[2].toLowerCase();
    const ext =
      rawExt === 'jpg'
        ? 'jpg'
        : rawExt === 'svg+xml'
          ? 'svg'
          : rawExt;
    const buffer = Buffer.from(match[3], 'base64');

    if (buffer.length === 0) {
      throw new BadRequestException('Image data is empty');
    }
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Image too large. Max 2MB.');
    }

    const key = `${this.keyPrefix}/${orgId}/logo-${Date.now()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mime,
          // Each upload gets a timestamped key, so the URL itself changes
          // when the logo changes — content at this key never mutates.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.error('Logo upload failed', err);
      throw new BadRequestException('Logo upload failed');
    }

    const logo_url = `${this.publicBaseUrl}/${key}`;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { logo_url, updated_at: new Date() },
    });

    return { logo_url };
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

    const userIds = members.map((m) => m.user_id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return members.map((member) => {
      const u = userMap.get(member.user_id);
      return {
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        permissions: member.permissions,
        joined_at: member.joined_at,
        name: u?.name || null,
        email: u?.email || null,
        phone: u?.phone || null,
      };
    });
  }

  async inviteUser(
    orgId: string,
    userId: string,
    data: { email: string; role: string },
  ) {
    await this.verifyMembership(orgId, userId);

    const targetEmail = data.email.trim().toLowerCase();
    const targetUser = await this.prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetUser) {
      throw new NotFoundException(
        'No user found with this email. They must sign up first.',
      );
    }

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
      name: targetUser.name,
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
