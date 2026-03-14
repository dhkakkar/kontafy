import { z } from 'zod';

const addressSchema = z.object({
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  state_code: z.string().length(2).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional(),
  country: z.string().max(50).default('India'),
});

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const createContactSchema = z.object({
  type: z.enum(['customer', 'vendor', 'both']),
  name: z.string().min(1, 'Name is required').max(200),
  company_name: z.string().max(200).optional(),
  gstin: z
    .string()
    .regex(gstinRegex, 'Invalid GSTIN format (e.g., 06AALCA0517J1Z2)')
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(panRegex, 'Invalid PAN format (e.g., ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(15).optional(),
  whatsapp: z.string().max(15).optional(),
  billing_address: addressSchema.optional(),
  shipping_address: addressSchema.optional(),
  payment_terms: z.number().int().min(0).max(365).default(30),
  credit_limit: z.number().min(0).optional(),
  opening_balance: z.number().default(0),
  notes: z.string().max(2000).optional(),
});

export const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company_name: z.string().max(200).optional().nullable(),
  gstin: z
    .string()
    .regex(gstinRegex, 'Invalid GSTIN format')
    .optional()
    .nullable()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(panRegex, 'Invalid PAN format')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(15).optional().nullable(),
  whatsapp: z.string().max(15).optional().nullable(),
  billing_address: addressSchema.optional(),
  shipping_address: addressSchema.optional(),
  payment_terms: z.number().int().min(0).max(365).optional(),
  credit_limit: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export type CreateContactDto = z.infer<typeof createContactSchema>;
export type UpdateContactDto = z.infer<typeof updateContactSchema>;
