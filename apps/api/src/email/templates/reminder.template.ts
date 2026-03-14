import { baseTemplate } from './base.template';

export interface ReminderEmailData {
  orgName: string;
  contactName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: string;
  balanceDue: string;
  currency: string;
  daysOverdue: number;
  viewUrl?: string;
}

export function reminderEmailTemplate(data: ReminderEmailData): string {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0F2D5E;">
      Payment Reminder
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">
      Hi ${data.contactName}, this is a friendly reminder that the following invoice is
      <strong style="color: #dc2626;">${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue</strong>.
    </p>

    <!-- Invoice Summary -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom: 12px; border-bottom: 1px solid #fecaca;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</td>
                    <td style="font-size: 14px; font-weight: 600; color: #0F2D5E; text-align: right;">${data.invoiceNumber}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #fecaca;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</td>
                    <td style="font-size: 14px; color: #dc2626; font-weight: 600; text-align: right;">${data.dueDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 14px; font-weight: 600; color: #0F2D5E;">Outstanding Amount</td>
                    <td style="font-size: 20px; font-weight: 700; color: #dc2626; text-align: right;">${data.currency} ${data.balanceDue}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${data.viewUrl ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <a href="${data.viewUrl}" class="btn-primary" style="display:inline-block;padding:12px 28px;background-color:#0F2D5E;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
            View & Pay Invoice
          </a>
        </td>
      </tr>
    </table>
    ` : ''}

    <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
      If you have already made the payment, please disregard this reminder.
      For any questions, feel free to reach out to us.
    </p>
    <p style="margin: 0; font-size: 13px; color: #94a3b8;">
      — ${data.orgName}
    </p>
  `;

  return baseTemplate(content, `Reminder: Invoice ${data.invoiceNumber} is ${data.daysOverdue} days overdue`);
}
