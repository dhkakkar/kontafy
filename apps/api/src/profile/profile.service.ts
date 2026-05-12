import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_COST = 10;

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  private readonly s3: S3Client;
  private readonly bucket = 'syscode-uploads';
  private readonly keyPrefix = 'kontafy/avatars';
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

  /**
   * Get the current user's profile + org memberships.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const memberships = await this.prisma.orgMember.findMany({
      where: { user_id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            legal_name: true,
            gstin: true,
            plan: true,
            logo_url: true,
          },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        legal_name: m.organization.legal_name,
        gstin: m.organization.gstin,
        plan: m.organization.plan,
        logo_url: m.organization.logo_url,
        role: m.role,
        joined_at: m.joined_at,
      })),
    };
  }

  /**
   * Update the current user's profile (name, phone, email, avatar).
   */
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      avatar_url?: string;
    },
  ) {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.email) {
      const newEmail = data.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { email: newEmail },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Email is already in use');
      }
      updateData.email = newEmail;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      name: updated.name,
      avatar_url: updated.avatar_url,
    };
  }

  /**
   * Upload a new avatar image for the user. Takes a data URL
   * ("data:image/png;base64,...") from the client, decodes it, uploads
   * to the Cloudflare R2 `syscode-uploads` bucket under
   * `kontafy/avatars/`, and stores the public URL on the user's metadata.
   */
  async uploadAvatar(userId: string, dataUrl: string) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new BadRequestException('Image data is required');
    }

    const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i.exec(
      dataUrl,
    );
    if (!match) {
      throw new BadRequestException(
        'Invalid image data. Expected a PNG, JPEG, or WEBP data URL.',
      );
    }
    const mime = match[1].toLowerCase();
    const ext = match[2].toLowerCase() === 'jpg' ? 'jpg' : match[2].toLowerCase();
    const base64 = match[3];
    const buffer = Buffer.from(base64, 'base64');

    if (buffer.length === 0) {
      throw new BadRequestException('Image data is empty');
    }
    if (buffer.length > 1024 * 1024) {
      throw new BadRequestException('Image too large. Max 1MB.');
    }

    const key = `${this.keyPrefix}/${userId}/avatar-${Date.now()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mime,
          // Each upload gets a timestamped key, so the URL itself changes
          // when the avatar changes — content at this key never mutates.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (err) {
      this.logger.error('Avatar upload failed', err);
      throw new BadRequestException('Avatar upload failed');
    }

    const avatar_url = `${this.publicBaseUrl}/${key}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar_url },
    });

    return { avatar_url };
  }

  /**
   * Change the current user's password. Requires current password.
   */
  async changePassword(
    userId: string,
    data: { current_password: string; new_password: string },
  ) {
    if (data.new_password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      !(await bcrypt.compare(data.current_password, user.password_hash))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(data.new_password, BCRYPT_COST);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });

    return { message: 'Password changed successfully' };
  }
}
