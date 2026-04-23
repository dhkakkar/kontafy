import { z } from 'zod';

// ─── Checkout ────────────────────────────────────────────────

export const CreateCheckoutDto = z.object({
  planId: z.enum(['starter', 'professional', 'enterprise']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});
export type CreateCheckoutDto = z.infer<typeof CreateCheckoutDto>;

// ─── Upgrade / Downgrade ────────────────────────────────────

export const ChangePlanDto = z.object({
  planId: z.enum(['free', 'starter', 'professional', 'enterprise']),
});
export type ChangePlanDto = z.infer<typeof ChangePlanDto>;

// ─── Webhook Payload ─────────────────────────────────────────

export const RazorpayWebhookDto = z.object({
  event: z.string(),
  payload: z.record(z.any()),
  account_id: z.string().optional(),
  contains: z.array(z.string()).optional(),
  created_at: z.number().optional(),
});
export type RazorpayWebhookDto = z.infer<typeof RazorpayWebhookDto>;

// ─── Cancel ──────────────────────────────────────────────────

export const CancelSubscriptionDto = z.object({
  reason: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().default(true),
});
export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionDto>;

// ─── Response Types ──────────────────────────────────────────

export interface PlanResponse {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, any>;
  popular?: boolean;
}

export interface CurrentSubscriptionResponse {
  planId: string;
  planName: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  razorpaySubscriptionId: string | null;
  features: Record<string, any>;
  // Org-level access state (used by frontend AccessGate / ExpiryBanner)
  orgActive: boolean;
  deactivationReason: string | null;
  // Days until plan_expires_at; null if no expiry or free plan; negative if already expired
  daysUntilExpiry: number | null;
  isExpired: boolean;
}

export interface UsageResponse {
  invoices: {
    used: number;
    limit: number;
    percentage: number;
  };
  users: {
    used: number;
    limit: number;
    percentage: number;
  };
  storage: {
    usedMb: number;
    limitMb: number;
    percentage: number;
  };
}

export interface BillingInvoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  planName: string;
  receiptUrl: string | null;
  razorpayPaymentId: string | null;
}

export interface CheckoutResponse {
  subscriptionId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  planName: string;
  description: string;
}
