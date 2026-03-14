import { z } from 'zod';

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const cinRegex = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

const orgAddressSchema = z.object({
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

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200),
  legal_name: z.string().max(200).optional(),
  gstin: z
    .string()
    .regex(gstinRegex, 'Invalid GSTIN format')
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(panRegex, 'Invalid PAN format')
    .optional()
    .or(z.literal('')),
  business_type: z
    .enum(['proprietorship', 'partnership', 'pvt_ltd', 'llp', 'public_ltd', 'trust', 'huf'])
    .optional(),
  industry: z
    .enum([
      'retail', 'manufacturing', 'services', 'trading', 'construction',
      'agriculture', 'healthcare', 'education', 'transport', 'hospitality',
      'technology', 'other',
    ])
    .optional(),
  address: orgAddressSchema.optional(),
  phone: z.string().max(15).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  legal_name: z.string().max(200).optional().nullable(),
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
  cin: z
    .string()
    .regex(cinRegex, 'Invalid CIN format')
    .optional()
    .nullable()
    .or(z.literal('')),
  business_type: z
    .enum(['proprietorship', 'partnership', 'pvt_ltd', 'llp', 'public_ltd', 'trust', 'huf'])
    .optional()
    .nullable(),
  industry: z.string().optional().nullable(),
  address: orgAddressSchema.optional(),
  phone: z.string().max(15).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  logo_url: z.string().url().optional().nullable(),
  settings: z.record(z.any()).optional(),
});

export const inviteMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['admin', 'accountant', 'viewer', 'ca']),
  permissions: z
    .object({
      modules: z.array(z.string()).optional(),
      actions: z.array(z.enum(['read', 'write', 'delete', 'export'])).optional(),
    })
    .optional(),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
