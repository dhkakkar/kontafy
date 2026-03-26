import { z } from 'zod';

export const CreateSalesReturnSchema = z.object({
  contact_id: z.string().uuid(),
  invoice_id: z.string().uuid().optional(),
  date: z.string(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(['draft', 'approved']).default('draft'),
  additional_discount: z.number().min(0).optional(),
  additional_charges: z.number().min(0).optional(),
  additional_charges_label: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string().uuid().optional(),
      description: z.string(),
      hsn_code: z.string().optional(),
      quantity: z.number().positive(),
      rate: z.number().min(0),
      discount_pct: z.number().min(0).max(100).optional(),
      cgst_rate: z.number().min(0).optional(),
      sgst_rate: z.number().min(0).optional(),
    }),
  ).min(1),
});

export type CreateSalesReturnDto = z.infer<typeof CreateSalesReturnSchema>;
