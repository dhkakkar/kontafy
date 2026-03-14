import { z } from 'zod';

export const CreateCreditNoteSchema = z.object({
  contact_id: z.string().uuid(),
  original_invoice_id: z.string().uuid().optional(),
  date: z.string(),
  place_of_supply: z.string().optional(),
  is_igst: z.boolean().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
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
  ).min(1),
});

export type CreateCreditNoteDto = z.infer<typeof CreateCreditNoteSchema>;

export const ApplyCreditNoteSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
});

export type ApplyCreditNoteDto = z.infer<typeof ApplyCreditNoteSchema>;
