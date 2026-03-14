import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

export interface RecurringInvoice {
  id: string;
  name: string;
  contact_id: string;
  contact: {
    id: string;
    name: string;
    company_name: string | null;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
  };
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string | null;
  next_issue_date: string;
  payment_terms_days: number;
  auto_send: boolean;
  place_of_supply: string | null;
  is_igst: boolean;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  status: "active" | "paused" | "stopped";
  generation_count: number;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
  items?: Array<{
    id: string;
    description: string;
    hsn_code: string | null;
    quantity: number;
    unit: string;
    rate: number;
    discount_pct: number;
    total: number;
  }>;
}

export interface GeneratedInvoice {
  id: string;
  invoice_number: string;
  status: string;
  date: string;
  total: number;
  contact: { id: string; name: string; company_name: string | null };
}

interface ApiResponse<T> {
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Hooks ────────────────────────────────────────────────────

export function useRecurringInvoices(params?: { page?: number; status?: string }) {
  return useQuery<ApiResponse<RecurringInvoice[]>>({
    queryKey: ["recurring-invoices", params],
    queryFn: () => {
      const query: Record<string, string> = {};
      if (params?.page) query.page = String(params.page);
      if (params?.status) query.status = params.status;
      return api.get<ApiResponse<RecurringInvoice[]>>("/recurring-invoices", query);
    },
  });
}

export function useRecurringInvoice(id: string) {
  return useQuery<RecurringInvoice>({
    queryKey: ["recurring-invoice", id],
    queryFn: () => api.get<RecurringInvoice>(`/recurring-invoices/${id}`),
    enabled: !!id,
  });
}

export function useRecurringInvoiceHistory(id: string, params?: { page?: number }) {
  return useQuery<ApiResponse<GeneratedInvoice[]>>({
    queryKey: ["recurring-invoice", id, "history", params],
    queryFn: () => {
      const query: Record<string, string> = {};
      if (params?.page) query.page = String(params.page);
      return api.get<ApiResponse<GeneratedInvoice[]>>(`/recurring-invoices/${id}/history`, query);
    },
    enabled: !!id,
  });
}

export function useCreateRecurringInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.post("/recurring-invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
    },
  });
}

export function useUpdateRecurringInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      api.patch(`/recurring-invoices/${id}`, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice", vars.id] });
    },
  });
}

export function usePauseRecurringInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/recurring-invoices/${id}/pause`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice", id] });
    },
  });
}

export function useResumeRecurringInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/recurring-invoices/${id}/resume`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice", id] });
    },
  });
}

export function useDeleteRecurringInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recurring-invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
    },
  });
}
