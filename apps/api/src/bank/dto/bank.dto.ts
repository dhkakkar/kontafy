import { z } from 'zod';

// ── Bank Accounts ──────────────────────────────────────────────────────

export const createBankAccountSchema = z.object({
  account_name: z.string().min(1, 'Account name is required'),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code')
    .optional(),
  account_type: z.enum(['current', 'savings', 'cash', 'overdraft']).optional(),
  opening_balance: z.number().default(0),
  account_id: z.string().uuid().optional(), // linked Chart-of-Accounts entry
});

export type CreateBankAccountDto = z.infer<typeof createBankAccountSchema>;

export const updateBankAccountSchema = z.object({
  account_name: z.string().min(1).optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code')
    .optional(),
  account_type: z.enum(['current', 'savings', 'cash', 'overdraft']).optional(),
  is_active: z.boolean().optional(),
  account_id: z.string().uuid().optional(),
});

export type UpdateBankAccountDto = z.infer<typeof updateBankAccountSchema>;

// ── Bank Transactions ──────────────────────────────────────────────────

export const createBankTransactionSchema = z.object({
  bank_account_id: z.string().uuid('Invalid bank account ID'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  reference: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['debit', 'credit']),
});

export type CreateBankTransactionDto = z.infer<typeof createBankTransactionSchema>;

export const reconcileTransactionSchema = z.object({
  matched_entry_id: z.string().uuid().optional(),
  payment_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
});

export type ReconcileTransactionDto = z.infer<typeof reconcileTransactionSchema>;

// ── Auto-match ─────────────────────────────────────────────────────────

export const autoMatchSchema = z.object({
  bank_account_id: z.string().uuid('Invalid bank account ID'),
  date_tolerance_days: z.number().int().min(0).max(30).default(7),
  amount_tolerance_pct: z.number().min(0).max(5).default(0), // exact match by default
});

export type AutoMatchDto = z.infer<typeof autoMatchSchema>;
