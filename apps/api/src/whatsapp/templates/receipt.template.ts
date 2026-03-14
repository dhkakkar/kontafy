/**
 * WhatsApp message template for payment receipts.
 */
export function receiptTemplate(params: {
  contactName: string;
  amount: string;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  orgName: string;
}): string {
  const lines = [
    `Hi ${params.contactName},`,
    '',
    `We've received your payment of *${params.amount}* on ${params.paymentDate}. Thank you!`,
  ];

  if (params.paymentMethod) {
    lines.push(`Payment method: ${params.paymentMethod}`);
  }

  if (params.reference) {
    lines.push(`Reference: ${params.reference}`);
  }

  lines.push(
    '',
    `Regards,`,
    params.orgName,
  );

  return lines.join('\n');
}
