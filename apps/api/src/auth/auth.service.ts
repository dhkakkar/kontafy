import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL', ''),
      this.configService.get<string>('SUPABASE_ANON_KEY', ''),
    );
  }

  /**
   * Send OTP to phone number via Supabase Auth.
   * Supabase handles the SMS delivery (Twilio/MessageBird configured in Supabase dashboard).
   */
  async sendOtp(phone: string) {
    // Normalize phone: ensure +91 prefix for Indian numbers
    const normalizedPhone = this.normalizeIndianPhone(phone);

    const { error } = await this.supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    if (error) {
      this.logger.error(`Failed to send OTP to ${normalizedPhone}`, error);
      throw new BadRequestException(`Failed to send OTP: ${error.message}`);
    }

    return {
      message: 'OTP sent successfully',
      phone: normalizedPhone,
    };
  }

  /**
   * Verify OTP and return JWT tokens.
   */
  async verifyOtp(phone: string, otp: string) {
    const normalizedPhone = this.normalizeIndianPhone(phone);

    const { data, error } = await this.supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otp,
      type: 'sms',
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid OTP or OTP expired');
    }

    // Check if user has any org memberships
    const memberships = await this.prisma.orgMember.findMany({
      where: { user_id: data.user!.id },
      include: { organization: { select: { id: true, name: true } } },
    });

    // Check superadmin status
    const superadmin = await this.prisma.superadmin.findUnique({
      where: { user_id: data.user!.id },
    });

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user!.id,
        phone: data.user!.phone,
        email: data.user!.email,
      },
      is_superadmin: !!superadmin,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    };
  }

  /**
   * Register new user with email/password.
   */
  async signUp(email: string, password: string, name?: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      throw new BadRequestException(`Registration failed: ${error.message}`);
    }

    return {
      message: 'Registration successful. Please verify your email.',
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    };
  }

  /**
   * Sign in with email/password.
   */
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const memberships = await this.prisma.orgMember.findMany({
      where: { user_id: data.user.id },
      include: { organization: { select: { id: true, name: true } } },
    });

    // Check superadmin status
    const superadmin = await this.prisma.superadmin.findUnique({
      where: { user_id: data.user.id },
    });

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
      },
      is_superadmin: !!superadmin,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    };
  }

  /**
   * Refresh an expired access token.
   */
  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    };
  }

  /**
   * Get user profile with org memberships.
   */
  async getProfile(userId: string) {
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

    // Check superadmin status
    const superadmin = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });

    return {
      id: userId,
      is_superadmin: !!superadmin,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        legal_name: m.organization.legal_name,
        gstin: m.organization.gstin,
        plan: m.organization.plan,
        logo_url: m.organization.logo_url,
        role: m.role,
        permissions: m.permissions,
        joined_at: m.joined_at,
      })),
    };
  }

  /**
   * Sign out the current session.
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      this.logger.error('Sign out failed', error);
    }
    return { message: 'Signed out successfully' };
  }

  /**
   * Normalize Indian phone numbers to E.164 format (+91XXXXXXXXXX).
   */
  private normalizeIndianPhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-()]/g, '');

    if (cleaned.startsWith('+91')) {
      return cleaned;
    }
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }

    return phone; // Return as-is if cannot normalize
  }
}
