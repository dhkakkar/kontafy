import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  type: z.enum(['received', 'made']),
  contact_id: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string(),
  method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other']),
  reference: z.string().optional(),
  bank_account_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

export const AllocatePaymentSchema = z.object({
  allocations: z.array(
    z.object({
      invoice_id: z.string().uuid(),
      amount: z.number().positive(),
    }),
  ).min(1),
});

export type AllocatePaymentDto = z.infer<typeof AllocatePaymentSchema>;
