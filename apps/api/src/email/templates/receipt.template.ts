import { baseTemplate } from './base.template';

export interface ReceiptEmailData {
  orgName: string;
  contactName: string;
  paymentAmount: string;
  currency: string;
  paymentDate: string;
  paymentMethod?: string;
  paymentReference?: string;
  invoiceNumber?: string;
  remainingBalance?: string;
}

export function receiptEmailTemplate(data: ReceiptEmailData): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 56px; height: 56px; background-color: #ecfdf5; border-radius: 50%; line-height: 56px; text-align: center; margin-bottom: 12px;">
        <span style="font-size: 28px;">&#10003;</span>
      </div>
      <h2 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #0A8A54;">
        Payment Received
      </h2>
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        Thank you for your payment, ${data.contactName}.
      </p>
    </div>

    <!-- Payment Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom: 16px; text-align: center;">
                <span style="font-size: 32px; font-weight: 700; color: #0A8A54;">${data.currency} ${data.paymentAmount}</span>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #bbf7d0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 13px; color: #64748b;">Payment Date</td>
                          <td style="font-size: 13px; color: #334155; text-align: right; font-weight: 500;">${data.paymentDate}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ${data.paymentMethod ? `
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #bbf7d0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 13px; color: #64748b;">Payment Method</td>
                          <td style="font-size: 13px; color: #334155; text-align: right; font-weight: 500;">${data.paymentMethod}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ` : ''}
                  ${data.paymentReference ? `
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #bbf7d0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 13px; color: #64748b;">Reference</td>
                          <td style="font-size: 13px; color: #334155; text-align: right; font-weight: 500;">${data.paymentReference}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ` : ''}
                  ${data.invoiceNumber ? `
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #bbf7d0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 13px; color: #64748b;">Applied to Invoice</td>
                          <td style="font-size: 13px; color: #334155; text-align: right; font-weight: 500;">${data.invoiceNumber}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ` : ''}
                  ${data.remainingBalance ? `
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #bbf7d0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 13px; color: #64748b;">Remaining Balance</td>
                          <td style="font-size: 13px; color: #334155; text-align: right; font-weight: 500;">${data.currency} ${data.remainingBalance}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
      This is an automated payment receipt from ${data.orgName}.
    </p>
  `;

  return baseTemplate(content, `Payment of ${data.currency} ${data.paymentAmount} received by ${data.orgName}`);
}
