import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface CashFlowPrediction {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface CashFlowForecast {
  predictions: CashFlowPrediction[];
  confidence: number;
  insights: string[];
  historicalMonths: number;
}

export interface Anomaly {
  id: string;
  type: "unusual_amount" | "duplicate_invoice" | "missing_sequence" | "expense_spike";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  amount?: number;
  detectedAt: string;
}

export interface Insight {
  id: string;
  type: "collections" | "expenses" | "gst" | "overdue" | "cash_flow" | "general";
  severity: "info" | "warning" | "danger" | "success";
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  data?: Record<string, unknown>;
}

export interface AiSettings {
  cashFlowForecast: boolean;
  anomalyDetection: boolean;
  insightGeneration: boolean;
  transactionCategorization: boolean;
  reconciliationAssist: boolean;
  apiKeyConfigured: boolean;
}

export interface StoredInsight {
  id: string;
  org_id: string;
  type: string;
  title: string;
  description: string | null;
  severity: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

// ─── Hooks ────────────────────────────────────────────────────

export function useCashFlowForecast() {
  return useQuery<CashFlowForecast>({
    queryKey: ["ai", "cash-flow-forecast"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CashFlowForecast>>(
        "/ai/cash-flow-forecast"
      );
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAiInsights() {
  return useQuery<Insight[]>({
    queryKey: ["ai", "insights"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Insight[]>>("/ai/insights");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAiAnomalies() {
  return useQuery<Anomaly[]>({
    queryKey: ["ai", "anomalies"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Anomaly[]>>("/ai/anomalies");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAiSettings() {
  return useQuery<AiSettings>({
    queryKey: ["ai", "settings"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AiSettings>>("/ai/settings");
      return res.data;
    },
  });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Omit<AiSettings, "apiKeyConfigured">>) => {
      const res = await api.patch<ApiResponse<AiSettings>>(
        "/ai/settings",
        data
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "settings"] });
    },
  });
}

export function useStoredInsights(limit: number = 5) {
  return useQuery<StoredInsight[]>({
    queryKey: ["ai", "stored-insights", limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<StoredInsight[]>>(
        "/ai/stored-insights",
        { limit: String(limit) }
      );
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      await api.post("/ai/dismiss-insight", { insightId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai"] });
    },
  });
}
