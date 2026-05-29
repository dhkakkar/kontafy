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
  // Bank account the expense was paid from. Required by accounting
  // for every non-cash payment method (UPI / bank_transfer / cheque /
  // card) so the JE hits the right 1102.NNN ledger. Cash mode leaves
  // this null and the future expense-JE poster will fall back to 1101.
  bank_account_id: z.string().uuid().nullish(),
});

export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>;

export const UpdateExpenseSchema = CreateExpenseSchema.partial().extend({
  status: z.enum(['pending', 'approved', 'paid', 'rejected']).optional(),
});

export type UpdateExpenseDto = z.infer<typeof UpdateExpenseSchema>;
