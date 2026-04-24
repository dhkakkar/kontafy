import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
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
   * Get the current user's profile from Supabase Auth + org memberships.
   */
  async getProfile(userId: string) {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);

    if (error || !data?.user) {
      throw new BadRequestException('Failed to fetch user profile');
    }

    const user = data.user;

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
      email: user.email || null,
      phone: user.phone || null,
      name: user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
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
   * Update the current user's profile (name, phone, avatar).
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

    if (data.email) {
      updateData.email = data.email;
    }
    if (data.phone) {
      updateData.phone = data.phone;
    }

    // Name and avatar go into user_metadata
    const metadataUpdate: Record<string, any> = {};
    if (data.name !== undefined) metadataUpdate.name = data.name;
    if (data.avatar_url !== undefined) metadataUpdate.avatar_url = data.avatar_url;

    if (Object.keys(metadataUpdate).length > 0) {
      updateData.user_metadata = metadataUpdate;
    }

    const { data: result, error } = await this.supabase.auth.admin.updateUserById(
      userId,
      updateData,
    );

    if (error) {
      this.logger.error(`Failed to update profile for user ${userId}`, error);
      throw new BadRequestException(`Failed to update profile: ${error.message}`);
    }

    return {
      id: result.user.id,
      email: result.user.email || null,
      phone: result.user.phone || null,
      name: result.user.user_metadata?.name || null,
      avatar_url: result.user.user_metadata?.avatar_url || null,
    };
  }

  /**
   * Upload a new avatar image for the user. Takes a data URL
   * ("data:image/png;base64,...") from the client, decodes it, uploads
   * to the Supabase Storage `avatars` bucket using the service role
   * (bypassing RLS), and stores the public URL on the user's metadata.
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

    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: uploadErr } = await this.supabase.storage
      .from('avatars')
      .upload(path, buffer, {
        contentType: mime,
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadErr) {
      this.logger.error('Avatar upload failed', uploadErr);
      throw new BadRequestException(`Upload failed: ${uploadErr.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from('avatars')
      .getPublicUrl(path);
    const avatar_url = urlData.publicUrl;

    // Persist on the user's Supabase Auth metadata so /profile reflects it.
    const { error: updateErr } =
      await this.supabase.auth.admin.updateUserById(userId, {
        user_metadata: { avatar_url },
      });
    if (updateErr) {
      this.logger.error('Failed to persist avatar URL', updateErr);
      throw new BadRequestException(
        `Failed to save avatar URL: ${updateErr.message}`,
      );
    }

    return { avatar_url };
  }

  /**
   * Change the current user's password.
   */
  async changePassword(
    userId: string,
    data: { current_password: string; new_password: string },
  ) {
    if (data.new_password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Update the password using admin API
    const { error } = await this.supabase.auth.admin.updateUserById(userId, {
      password: data.new_password,
    });

    if (error) {
      this.logger.error(`Failed to change password for user ${userId}`, error);
      throw new BadRequestException(`Failed to change password: ${error.message}`);
    }

    return { message: 'Password changed successfully' };
  }
}
