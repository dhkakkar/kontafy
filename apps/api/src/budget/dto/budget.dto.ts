import { z } from 'zod';

export const CreateBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  description: z.string().optional(),
  fiscal_year: z.string().optional(), // e.g., "2025-26"
  period_type: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  start_date: z.string(),
  end_date: z.string(),
  branch_id: z.string().uuid().optional(),
  line_items: z.array(
    z.object({
      account_id: z.string().uuid(),
      jan: z.number().min(0).optional().default(0),
      feb: z.number().min(0).optional().default(0),
      mar: z.number().min(0).optional().default(0),
      apr: z.number().min(0).optional().default(0),
      may: z.number().min(0).optional().default(0),
      jun: z.number().min(0).optional().default(0),
      jul: z.number().min(0).optional().default(0),
      aug: z.number().min(0).optional().default(0),
      sep: z.number().min(0).optional().default(0),
      oct: z.number().min(0).optional().default(0),
      nov: z.number().min(0).optional().default(0),
      dec: z.number().min(0).optional().default(0),
    }),
  ).min(1, 'At least one line item is required'),
});

export type CreateBudgetDto = z.infer<typeof CreateBudgetSchema>;

export const UpdateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  line_items: z.array(
    z.object({
      account_id: z.string().uuid(),
      jan: z.number().min(0).optional().default(0),
      feb: z.number().min(0).optional().default(0),
      mar: z.number().min(0).optional().default(0),
      apr: z.number().min(0).optional().default(0),
      may: z.number().min(0).optional().default(0),
      jun: z.number().min(0).optional().default(0),
      jul: z.number().min(0).optional().default(0),
      aug: z.number().min(0).optional().default(0),
      sep: z.number().min(0).optional().default(0),
      oct: z.number().min(0).optional().default(0),
      nov: z.number().min(0).optional().default(0),
      dec: z.number().min(0).optional().default(0),
    }),
  ).optional(),
});

export type UpdateBudgetDto = z.infer<typeof UpdateBudgetSchema>;
