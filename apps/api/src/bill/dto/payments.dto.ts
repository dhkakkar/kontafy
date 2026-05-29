import { z } from 'zod';

/**
 * A single line of bill-wise settlement — the payment amount being
 * applied to one specific invoice/bill. Multiple allocations on the
 * same payment together must not exceed the payment's `amount`; the
 * remainder is treated as a customer/vendor advance and routed to
 * the 2116 / 1112 accounts at JE-posting time.
 */
export const PaymentAllocationLineSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
});

export type PaymentAllocationLineDto = z.infer<typeof PaymentAllocationLineSchema>;

export const CreatePaymentSchema = z.object({
  type: z.enum(['received', 'made']),
  contact_id: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string(),
  method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other']),
  reference: z.string().optional(),
  // Required by accounting design — every receipt/payment must hit
  // a specific cash or bank ledger so reconciliation works. When the
  // user picks "Cash in Hand" on the frontend, this stays null and
  // postPayment falls back to the 1101 ledger.
  bank_account_id: z.string().uuid().nullish(),
  // Bill-wise settlement: explicit allocations across one or more
  // invoices/bills. Sum of `allocations[].amount` may be less than
  // `amount` — the remainder is an advance and gets booked to 2116
  // (customer side) or 1112 (vendor side).
  allocations: z.array(PaymentAllocationLineSchema).optional(),
  // Legacy single-invoice shortcut. Kept so old callers (and the
  // standalone payments modal) still work — the service collapses
  // it into a single-row `allocations` array internally.
  invoice_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

export const AllocatePaymentSchema = z.object({
  allocations: z.array(PaymentAllocationLineSchema).min(1),
});

export type AllocatePaymentDto = z.infer<typeof AllocatePaymentSchema>;
