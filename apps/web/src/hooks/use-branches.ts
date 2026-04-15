import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: Record<string, string>;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchSummary {
  branch: Branch;
  summary: {
    revenue: number;
    expenses: number;
    profit: number;
    invoiceCount: number;
  };
}

export interface BranchStockItem {
  id: string;
  product: { id: string; name: string; sku: string; unit: string; selling_price: number };
  warehouse: { id: string; name: string };
  quantity: number;
}

interface ApiResponse<T> {
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

// ─── Hooks ────────────────────────────────────────────────────

export function useBranches(params?: { page?: number; search?: string; is_active?: string }) {
  return useQuery<ApiResponse<Branch[]>>({
    queryKey: ["branches", params],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params?.page) query.page = String(params.page);
      if (params?.search) query.search = params.search;
      if (params?.is_active) query.is_active = params.is_active;
      const res = await api.get<ApiEnvelope<Branch[]>>("/branches", query);
      return {
        data: res.data,
        meta: res.meta as ApiResponse<Branch[]>["meta"],
      };
    },
  });
}

export function useBranch(id: string) {
  return useQuery<Branch>({
    queryKey: ["branch", id],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Branch>>(`/branches/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useBranchSummary(id: string, params?: { from?: string; to?: string }) {
  return useQuery<BranchSummary>({
    queryKey: ["branch", id, "summary", params],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params?.from) query.from = params.from;
      if (params?.to) query.to = params.to;
      const res = await api.get<ApiEnvelope<BranchSummary>>(
        `/branches/${id}/summary`,
        query,
      );
      return res.data;
    },
    enabled: !!id,
  });
}

export function useBranchStock(id: string, params?: { page?: number; search?: string }) {
  return useQuery<ApiResponse<BranchStockItem[]>>({
    queryKey: ["branch", id, "stock", params],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params?.page) query.page = String(params.page);
      if (params?.search) query.search = params.search;
      const res = await api.get<ApiEnvelope<BranchStockItem[]>>(
        `/branches/${id}/stock`,
        query,
      );
      return {
        data: res.data,
        meta: res.meta as ApiResponse<BranchStockItem[]>["meta"],
      };
    },
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      code?: string;
      address?: Record<string, string>;
      phone?: string;
      email?: string;
      manager_name?: string;
      is_main?: boolean;
    }) => api.post("/branches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      api.patch(`/branches/${id}`, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branch", vars.id] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
