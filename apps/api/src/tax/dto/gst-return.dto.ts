import { z } from 'zod';

export const ComputeGstReturnSchema = z.object({
  return_type: z.enum(['GSTR1', 'GSTR3B']),
  from_date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid from_date'),
  to_date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid to_date'),
});

export type ComputeGstReturnDto = z.infer<typeof ComputeGstReturnSchema>;

export const SaveGstReturnSchema = z.object({
  return_type: z.enum(['GSTR1', 'GSTR3B']),
  period: z.string().min(1, 'Period is required'), // e.g. "2026-03" or "2025-Q4"
  data: z.record(z.any()),
  status: z.enum(['draft', 'computed', 'filed']).optional().default('draft'),
});

export type SaveGstReturnDto = z.infer<typeof SaveGstReturnSchema>;

export const FileGstReturnSchema = z.object({
  arn: z.string().optional(),
});

export type FileGstReturnDto = z.infer<typeof FileGstReturnSchema>;

export const ListGstReturnsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  return_type: z.enum(['GSTR1', 'GSTR3B', 'GSTR9', 'GSTR9C']).optional(),
  status: z.enum(['draft', 'computed', 'filed']).optional(),
  period: z.string().optional(),
});

export type ListGstReturnsQueryDto = z.infer<typeof ListGstReturnsQuerySchema>;
