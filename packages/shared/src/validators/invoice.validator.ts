import { z } from 'zod';

const invoiceItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required').max(500),
  hsn_code: z.string().max(8).optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().default('pcs'),
  rate: z.number().min(0, 'Rate cannot be negative'),
  discount_pct: z.number().min(0).max(100).default(0),
  cgst_rate: z.number().min(0).max(50).default(0),
  sgst_rate: z.number().min(0).max(50).default(0),
  igst_rate: z.number().min(0).max(50).default(0),
  cess_rate: z.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  type: z.enum(['sale', 'purchase', 'credit_note', 'debit_note']),
  contact_id: z.string().uuid('Invalid contact ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .optional(),
  place_of_supply: z.string().length(2).optional(),
  is_igst: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  items: z
    .array(invoiceItemSchema)
    .min(1, 'At least one item is required')
    .max(100, 'Maximum 100 items per invoice'),
});

export const updateInvoiceSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  place_of_supply: z.string().length(2).optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
});

export const invoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled']),
});

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceDto = z.infer<typeof updateInvoiceSchema>;
export type InvoiceStatusDto = z.infer<typeof invoiceStatusSchema>;
