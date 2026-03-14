import { baseTemplate } from './base.template';

export interface InvoiceEmailData {
  orgName: string;
  contactName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: string;
  balanceDue: string;
  currency: string;
  viewUrl?: string;
}

export function invoiceEmailTemplate(data: InvoiceEmailData): string {
  const content = `
    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0F2D5E;">
      Invoice from ${data.orgName}
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">
      Hi ${data.contactName}, please find your invoice details below.
    </p>

    <!-- Invoice Summary Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</td>
                    <td style="font-size: 14px; font-weight: 600; color: #0F2D5E; text-align: right;">${data.invoiceNumber}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Date</td>
                    <td style="font-size: 14px; color: #334155; text-align: right;">${data.invoiceDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</td>
                    <td style="font-size: 14px; color: #334155; text-align: right;">${data.dueDate || 'On Receipt'}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 14px; font-weight: 600; color: #0F2D5E;">Amount Due</td>
                    <td style="font-size: 20px; font-weight: 700; color: #0A8A54; text-align: right;">${data.currency} ${data.balanceDue}</td>
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
            View Invoice
          </a>
        </td>
      </tr>
    </table>
    ` : ''}

    <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
      The invoice PDF is attached to this email for your records.
    </p>
  `;

  return baseTemplate(content, `Invoice ${data.invoiceNumber} from ${data.orgName} — ${data.currency} ${data.balanceDue}`);
}
