import { z } from 'zod';

export const SendInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  phoneNumber: z.string().min(10).max(15),
});
export type SendInvoiceDto = z.infer<typeof SendInvoiceSchema>;

export const SendReminderSchema = z.object({
  invoiceId: z.string().uuid(),
});
export type SendReminderDto = z.infer<typeof SendReminderSchema>;

export const SendReceiptSchema = z.object({
  paymentId: z.string().uuid(),
});
export type SendReceiptDto = z.infer<typeof SendReceiptSchema>;

export const WebhookPayloadSchema = z.object({
  /** Provider-specific message ID */
  messageId: z.string(),
  /** Delivery status from the provider */
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  /** Timestamp from the provider */
  timestamp: z.string().optional(),
  /** Error details if status is 'failed' */
  error: z.string().optional(),
});
export type WebhookPayloadDto = z.infer<typeof WebhookPayloadSchema>;
