import { z } from 'zod';

export const CreatePurchaseSchema = z.object({
  contact_id: z.string().uuid(),
  date: z.string(),
  due_date: z.string().optional(),
  place_of_supply: z.string().optional(),
  is_igst: z.boolean().optional(),
  vendor_invoice_number: z.string().optional(),
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
  ).min(1),
});

export type CreatePurchaseDto = z.infer<typeof CreatePurchaseSchema>;

export const UpdatePurchaseSchema = z.object({
  contact_id: z.string().uuid().optional(),
  date: z.string().optional(),
  due_date: z.string().optional(),
  place_of_supply: z.string().optional(),
  is_igst: z.boolean().optional(),
  vendor_invoice_number: z.string().optional(),
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

export type UpdatePurchaseDto = z.infer<typeof UpdatePurchaseSchema>;
