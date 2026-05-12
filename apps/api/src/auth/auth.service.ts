import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL_DAYS = 30;
const PASSWORD_RESET_TTL_MINUTES = 60;
const BCRYPT_COST = 10;

interface SessionResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email: string; phone: string | null };
  is_superadmin: boolean;
  organizations: Array<{ id: string; name: string; role: string }>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async signUp(email: string, password: string, name?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!this.isEmail(normalizedEmail)) {
      throw new BadRequestException('Invalid email address');
    }
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password_hash,
        name: name?.trim() || null,
      },
    });

    return {
      message: 'Registration successful',
      user: { id: user.id, email: user.email },
    };
  }

  async signIn(email: string, password: string): Promise<SessionResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildSession(user.id, user.email, user.phone);
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });
    if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke the used token, issue a fresh pair.
    const user = await this.prisma.user.findUnique({ where: { id: stored.user_id } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    return this.buildSession(user.id, user.email, user.phone);
  }

  async signOut(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.sha256(refreshToken);
      await this.prisma.refreshToken
        .updateMany({
          where: { token_hash: tokenHash, revoked_at: null },
          data: { revoked_at: new Date() },
        })
        .catch(() => undefined);
    }
    return { message: 'Signed out successfully' };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return the same response — don't leak whether the email exists.
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('base64url');
      const token_hash = this.sha256(rawToken);
      const expires_at = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

      await this.prisma.passwordResetToken.create({
        data: { user_id: user.id, token_hash, expires_at },
      });

      try {
        await this.emailService.sendPasswordReset(user.email, rawToken);
      } catch (err) {
        this.logger.error('Failed to queue password reset email', err);
      }
    }

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const token_hash = this.sha256(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token_hash },
    });
    if (!record || record.used_at || record.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_COST);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.user_id },
        data: { password_hash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used_at: new Date() },
      }),
      // Revoke all refresh tokens — force re-login on every device.
      this.prisma.refreshToken.updateMany({
        where: { user_id: record.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });

    return { message: 'Password changed successfully' };
  }

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

    const superadmin = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar_url: user.avatar_url,
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

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────

  private async buildSession(
    userId: string,
    email: string,
    phone: string | null,
  ): Promise<SessionResponse> {
    const memberships = await this.prisma.orgMember.findMany({
      where: { user_id: userId },
      include: { organization: { select: { id: true, name: true } } },
    });
    const superadmin = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });

    const issuedAt = Math.floor(Date.now() / 1000);
    const expires_at = issuedAt + ACCESS_TOKEN_TTL_SECONDS;

    const access_token = await this.jwtService.signAsync(
      { sub: userId, email },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    const refresh_token = crypto.randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: this.sha256(refresh_token),
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000),
      },
    });

    return {
      access_token,
      refresh_token,
      expires_at,
      user: { id: userId, email, phone },
      is_superadmin: !!superadmin,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    };
  }

  private sha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private isEmail(input: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  }
}
