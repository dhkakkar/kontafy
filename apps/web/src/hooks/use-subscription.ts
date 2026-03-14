import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

export interface PlanFeatures {
  maxUsers: number;
  maxInvoicesPerMonth: number;
  maxStorageMb: number;
  whatsappMessaging: boolean;
  ecommerceSync: boolean;
  aiInsights: boolean;
  caPortal: boolean;
  bankReconciliation: boolean;
  multiWarehouse: boolean;
  customReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  dedicatedManager: boolean;
  tdsTracking: boolean;
  gstFiling: boolean;
  bulkInvoicing: boolean;
  auditTrail: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeatures;
  popular: boolean;
}

export interface CurrentSubscription {
  planId: string;
  planName: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  razorpaySubscriptionId: string | null;
  features: PlanFeatures;
}

export interface UsageMetric {
  used: number;
  limit: number;
  percentage: number;
}

export interface UsageResponse {
  invoices: UsageMetric;
  users: UsageMetric;
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

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

// ─── Query Keys ──────────────────────────────────────────────

const subscriptionKeys = {
  all: ["subscription"] as const,
  plans: () => [...subscriptionKeys.all, "plans"] as const,
  current: () => [...subscriptionKeys.all, "current"] as const,
  usage: () => [...subscriptionKeys.all, "usage"] as const,
  invoices: () => [...subscriptionKeys.all, "invoices"] as const,
};

// ─── Query Hooks ─────────────────────────────────────────────

export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: subscriptionKeys.plans(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Plan[]>>("/subscription/plans");
      return res.data;
    },
  });
}

export function useCurrentSubscription() {
  return useQuery<CurrentSubscription>({
    queryKey: subscriptionKeys.current(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<CurrentSubscription>>(
        "/subscription/current"
      );
      return res.data;
    },
  });
}

export function useUsage() {
  return useQuery<UsageResponse>({
    queryKey: subscriptionKeys.usage(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<UsageResponse>>(
        "/subscription/usage"
      );
      return res.data;
    },
  });
}

export function useBillingInvoices() {
  return useQuery<BillingInvoice[]>({
    queryKey: subscriptionKeys.invoices(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<BillingInvoice[]>>(
        "/subscription/invoices"
      );
      return res.data;
    },
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────

export function useCreateCheckout() {
  const queryClient = useQueryClient();

  return useMutation<
    CheckoutResponse,
    Error,
    { planId: string; billingCycle: "monthly" | "yearly" }
  >({
    mutationFn: async (params) => {
      const res = await api.post<ApiResponse<CheckoutResponse>>(
        "/subscription/checkout",
        params
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

export function useUpgradePlan() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { planId: string }>({
    mutationFn: async (params) => {
      const res = await api.post<ApiResponse<any>>(
        "/subscription/upgrade",
        params
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

export function useDowngradePlan() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { planId: string }>({
    mutationFn: async (params) => {
      const res = await api.post<ApiResponse<any>>(
        "/subscription/downgrade",
        params
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    { cancelAtPeriodEnd?: boolean; reason?: string }
  >({
    mutationFn: async (params) => {
      const res = await api.post<ApiResponse<any>>(
        "/subscription/cancel",
        params
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}
