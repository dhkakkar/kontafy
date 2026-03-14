import { baseTemplate } from './base.template';

export interface WelcomeEmailData {
  userName: string;
  orgName: string;
  loginUrl?: string;
}

export function welcomeEmailTemplate(data: WelcomeEmailData): string {
  const loginUrl = data.loginUrl || 'https://app.kontafy.in';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0F2D5E;">
        Welcome to Kontafy!
      </h2>
      <p style="margin: 0; font-size: 15px; color: #64748b;">
        Hi ${data.userName}, your account for <strong>${data.orgName}</strong> is ready.
      </p>
    </div>

    <!-- Feature highlights -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="40" valign="top">
                <span style="display: inline-block; width: 32px; height: 32px; background-color: #ecfdf5; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">&#128203;</span>
              </td>
              <td style="padding-left: 12px;">
                <strong style="font-size: 14px; color: #0F2D5E;">GST-Compliant Invoicing</strong>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Create professional invoices with automatic GST calculations.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="40" valign="top">
                <span style="display: inline-block; width: 32px; height: 32px; background-color: #eff6ff; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">&#128200;</span>
              </td>
              <td style="padding-left: 12px;">
                <strong style="font-size: 14px; color: #0F2D5E;">Real-time Financial Reports</strong>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">P&L, Balance Sheet, Cash Flow — all generated instantly.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="40" valign="top">
                <span style="display: inline-block; width: 32px; height: 32px; background-color: #fef3c7; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">&#128230;</span>
              </td>
              <td style="padding-left: 12px;">
                <strong style="font-size: 14px; color: #0F2D5E;">Inventory Management</strong>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Track stock across warehouses with low-stock alerts.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 16px;">
          <a href="${loginUrl}" class="btn-success" style="display:inline-block;padding:14px 32px;background-color:#0A8A54;color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
            Get Started
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
      Need help? Reply to this email or visit our help centre.
    </p>
  `;

  return baseTemplate(content, `Welcome to Kontafy, ${data.userName}! Your account is ready.`);
}
