import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

export interface BudgetLineItem {
  id: string;
  account_id: string;
  account: { id: string; code: string; name: string; type: string };
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

export interface Budget {
  id: string;
  name: string;
  description: string | null;
  fiscal_year: string;
  period_type: string;
  start_date: string;
  end_date: string;
  branch_id: string | null;
  total_amount: number;
  status: "draft" | "active" | "closed";
  created_at: string;
  updated_at: string;
  line_items?: BudgetLineItem[];
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  activeBudgetCount: number;
}

export interface VarianceRow {
  accountId: string;
  account: { id: string; code: string; name: string; type: string };
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  utilized: number;
  monthlyBudget: number[];
  status: "over_budget" | "warning" | "on_track";
}

export interface VarianceReport {
  data: VarianceRow[];
  totals: {
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
    utilized: number;
  };
}

interface ApiResponse<T> {
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Hooks ────────────────────────────────────────────────────

export function useBudgets(params?: { page?: number; status?: string; fiscal_year?: string }) {
  return useQuery<ApiResponse<Budget[]>>({
    queryKey: ["budgets", params],
    queryFn: () => {
      const query: Record<string, string> = {};
      if (params?.page) query.page = String(params.page);
      if (params?.status) query.status = params.status;
      if (params?.fiscal_year) query.fiscal_year = params.fiscal_year;
      return api.get<ApiResponse<Budget[]>>("/budgets", query);
    },
  });
}

export function useBudget(id: string) {
  return useQuery<Budget>({
    queryKey: ["budget", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Budget>>(`/budgets/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useBudgetSummary() {
  return useQuery<BudgetSummary>({
    queryKey: ["budgets", "summary"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BudgetSummary>>("/budgets/summary");
      return res.data;
    },
  });
}

export function useBudgetVariance(params?: { budget_id?: string; from?: string; to?: string }) {
  return useQuery<VarianceReport>({
    queryKey: ["budgets", "variance", params],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params?.budget_id) query.budget_id = params.budget_id;
      if (params?.from) query.from = params.from;
      if (params?.to) query.to = params.to;
      const res = await api.get<ApiResponse<VarianceReport>>("/budgets/variance", query);
      return res.data;
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      fiscal_year?: string;
      period_type?: string;
      start_date: string;
      end_date: string;
      branch_id?: string;
      line_items: Array<{
        account_id: string;
        jan?: number; feb?: number; mar?: number;
        apr?: number; may?: number; jun?: number;
        jul?: number; aug?: number; sep?: number;
        oct?: number; nov?: number; dec?: number;
      }>;
    }) => api.post("/budgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      api.patch(`/budgets/${id}`, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget", vars.id] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
