/**
 * WhatsApp message template for overdue payment reminders.
 */
export function reminderTemplate(params: {
  contactName: string;
  invoiceNumber: string;
  amount: string;
  daysOverdue: number;
  paymentLink?: string;
  orgName: string;
}): string {
  const lines = [
    `Hi ${params.contactName},`,
    '',
    `This is a friendly reminder that payment of *${params.amount}* for invoice *#${params.invoiceNumber}* is overdue by *${params.daysOverdue} day${params.daysOverdue === 1 ? '' : 's'}*.`,
  ];

  if (params.paymentLink) {
    lines.push('', `Pay now: ${params.paymentLink}`);
  }

  lines.push(
    '',
    `Please arrange the payment at the earliest. If you have already paid, kindly ignore this message.`,
    '',
    `Regards,`,
    params.orgName,
  );

  return lines.join('\n');
}
