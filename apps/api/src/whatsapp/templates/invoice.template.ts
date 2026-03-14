/**
 * WhatsApp message template for sending invoices.
 */
export function invoiceTemplate(params: {
  contactName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string;
  paymentLink?: string;
  orgName: string;
}): string {
  const lines = [
    `Hi ${params.contactName},`,
    '',
    `Here's your invoice *#${params.invoiceNumber}* for *${params.amount}* from ${params.orgName}.`,
  ];

  if (params.dueDate) {
    lines.push(`Due date: ${params.dueDate}`);
  }

  if (params.paymentLink) {
    lines.push('', `Pay now: ${params.paymentLink}`);
  }

  lines.push('', 'Thank you for your business!');

  return lines.join('\n');
}
