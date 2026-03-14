import { z } from 'zod';

export const CreateRecurringInvoiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_id: z.string().uuid(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  start_date: z.string(),
  end_date: z.string().optional(),
  next_issue_date: z.string().optional(),
  payment_terms_days: z.number().min(0).default(30),
  auto_send: z.boolean().default(false),
  place_of_supply: z.string().optional(),
  is_igst: z.boolean().optional().default(false),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string().uuid().optional(),
      description: z.string(),
      hsn_code: z.string().optional(),
      quantity: z.number().positive(),
      unit: z.string().optional(),
      rate: z.number().min(0),
      discount_pct: z.number().min(0).max(100).optional(),
      cgst_rate: z.number().min(0).optional(),
      sgst_rate: z.number().min(0).optional(),
      igst_rate: z.number().min(0).optional(),
      cess_rate: z.number().min(0).optional(),
    }),
  ).min(1, 'At least one item is required'),
});

export type CreateRecurringInvoiceDto = z.infer<typeof CreateRecurringInvoiceSchema>;

export const UpdateRecurringInvoiceSchema = z.object({
  name: z.string().min(1).optional(),
  contact_id: z.string().uuid().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  end_date: z.string().nullable().optional(),
  payment_terms_days: z.number().min(0).optional(),
  auto_send: z.boolean().optional(),
  place_of_supply: z.string().optional(),
  is_igst: z.boolean().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string().uuid().optional(),
      description: z.string(),
      hsn_code: z.string().optional(),
      quantity: z.number().positive(),
      unit: z.string().optional(),
      rate: z.number().min(0),
      discount_pct: z.number().min(0).max(100).optional(),
      cgst_rate: z.number().min(0).optional(),
      sgst_rate: z.number().min(0).optional(),
      igst_rate: z.number().min(0).optional(),
      cess_rate: z.number().min(0).optional(),
    }),
  ).min(1).optional(),
});

export type UpdateRecurringInvoiceDto = z.infer<typeof UpdateRecurringInvoiceSchema>;
