import { z } from 'zod';

export const CreateExpenseSchema = z.object({
  date: z.string(),
  category: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  payment_method: z.string(),
  reference: z.string().optional(),
  vendor_name: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>;

export const UpdateExpenseSchema = CreateExpenseSchema.partial().extend({
  status: z.enum(['pending', 'approved', 'paid', 'rejected']).optional(),
});

export type UpdateExpenseDto = z.infer<typeof UpdateExpenseSchema>;
