import { baseTemplate } from './base.template';

export interface PasswordResetEmailData {
  email: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function passwordResetEmailTemplate(data: PasswordResetEmailData): string {
  const expiry = data.expiresInMinutes || 60;

  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0F2D5E;">
      Reset Your Password
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">
      We received a request to reset the password for <strong>${data.email}</strong>.
      Click the button below to set a new password.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <a href="${data.resetUrl}" class="btn-primary" style="display:inline-block;padding:14px 32px;background-color:#0F2D5E;color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            This link will expire in <strong>${expiry} minutes</strong>.
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      If the button doesn't work, copy and paste this URL into your browser:<br />
      <a href="${data.resetUrl}" style="color: #0A8A54; word-break: break-all; font-size: 11px;">${data.resetUrl}</a>
    </p>
  `;

  return baseTemplate(content, 'Reset your Kontafy password');
}
