import { z } from 'zod';

export const CreateTdsEntrySchema = z.object({
  contact_id: z.string().uuid().optional(),
  section: z.string().min(1, 'TDS section is required'),
  transaction_date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  gross_amount: z.number().positive('Gross amount must be positive'),
  tds_rate: z.number().min(0).max(100),
  tds_amount: z.number().min(0),
  payment_id: z.string().uuid().optional(),
});

export type CreateTdsEntryDto = z.infer<typeof CreateTdsEntrySchema>;

export const ListTdsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  section: z.string().optional(),
  status: z.enum(['pending', 'deposited', 'filed']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ListTdsQueryDto = z.infer<typeof ListTdsQuerySchema>;

export const TdsSummaryQuerySchema = z.object({
  from: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid from date'),
  to: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid to date'),
});

export type TdsSummaryQueryDto = z.infer<typeof TdsSummaryQuerySchema>;
