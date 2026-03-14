import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface EInvoiceDashboardStats {
  total_eligible: number;
  generated: number;
  pending: number;
  eway_bills_generated: number;
  recent_pending: Array<{
    id: string;
    invoice_number: string;
    total: number;
    date: string;
    contact_name: string;
  }>;
}

export interface EInvoiceListItem {
  id: string;
  invoice_number: string;
  type: string;
  invoice_status: string;
  einvoice_status: "generated" | "pending" | "cancelled" | "failed";
  date: string;
  total: number;
  irn: string | null;
  ack_no: string | null;
  eway_bill_no: string | null;
  contact_name: string | null;
  contact_gstin: string | null;
}

export interface EInvoiceStatus {
  invoice_id: string;
  invoice_number: string;
  irn: string | null;
  ack_no: string | null;
  eway_bill_no: string | null;
  invoice_status: string;
  einvoice_status: string;
  total: number;
  date: string;
  contact_name: string | null;
  contact_gstin: string | null;
  nic_status: any;
}

export interface EInvoiceRecord {
  id: string;
  invoice_number: string;
  irn: string | null;
  ack_no: string | null;
  ack_date: string | null;
  signed_qr_code: string | null;
  status: string;
  error_message: string | null;
  payload: any;
  response: any;
}

export interface EwayBillListItem {
  id: string;
  invoice_number: string;
  type: string;
  invoice_status: string;
  eway_status: string;
  date: string;
  total: number;
  eway_bill_no: string | null;
  irn: string | null;
  requires_eway_bill: boolean;
  contact_name: string | null;
  contact_gstin: string | null;
}

export interface GspSettings {
  gsp_provider: string;
  gsp_username: string;
  gsp_password: string;
  gsp_client_id: string;
  gsp_client_secret: string;
  gstin: string;
  auto_generate: boolean;
  auto_eway_bill: boolean;
  eway_bill_threshold: number;
  sandbox_mode: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// ─── Hooks ────────────────────────────────────────────────────

export function useEInvoiceDashboard() {
  return useQuery<EInvoiceDashboardStats>({
    queryKey: ["einvoice", "dashboard"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<EInvoiceDashboardStats>>(
        "/einvoice/dashboard",
      );
      return res.data;
    },
  });
}

export function useEInvoiceList(params: {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}) {
  return useQuery<PaginatedResponse<EInvoiceListItem>>({
    queryKey: ["einvoice", "list", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params.page) queryParams.page = String(params.page);
      if (params.limit) queryParams.limit = String(params.limit);
      if (params.status) queryParams.status = params.status;
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      if (params.search) queryParams.search = params.search;

      const res = await api.get<ApiResponse<PaginatedResponse<EInvoiceListItem>>>(
        "/einvoice/list",
        queryParams,
      );
      return res.data;
    },
  });
}

export function useEInvoiceStatus(invoiceId: string) {
  return useQuery<EInvoiceStatus>({
    queryKey: ["einvoice", "status", invoiceId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<EInvoiceStatus>>(
        `/einvoice/status/${invoiceId}`,
      );
      return res.data;
    },
    enabled: !!invoiceId,
  });
}

export function useGenerateEInvoice() {
  const queryClient = useQueryClient();

  return useMutation<EInvoiceRecord, Error, string>({
    mutationFn: async (invoiceId: string) => {
      const res = await api.post<ApiResponse<EInvoiceRecord>>(
        `/einvoice/generate/${invoiceId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["einvoice"] });
    },
  });
}

export function useBulkGenerateEInvoice() {
  const queryClient = useQueryClient();

  return useMutation<
    { batch_id: string; invoice_count: number; status: string; message: string },
    Error,
    string[]
  >({
    mutationFn: async (invoiceIds: string[]) => {
      const res = await api.post<
        ApiResponse<{ batch_id: string; invoice_count: number; status: string; message: string }>
      >("/einvoice/bulk-generate", { invoice_ids: invoiceIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["einvoice"] });
    },
  });
}

export function useCancelEInvoice() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { invoiceId: string; reason: string; remarks: string }>({
    mutationFn: async ({ invoiceId, reason, remarks }) => {
      const res = await api.post<ApiResponse<any>>(
        `/einvoice/cancel/${invoiceId}`,
        { reason, remarks },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["einvoice"] });
    },
  });
}

// ─── E-Way Bill Hooks ──────────────────────────────────────────

export function useEwayBillList(params: {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}) {
  return useQuery<PaginatedResponse<EwayBillListItem>>({
    queryKey: ["eway-bill", "list", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params.page) queryParams.page = String(params.page);
      if (params.limit) queryParams.limit = String(params.limit);
      if (params.status) queryParams.status = params.status;
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      if (params.search) queryParams.search = params.search;

      const res = await api.get<ApiResponse<PaginatedResponse<EwayBillListItem>>>(
        "/eway-bill/list",
        queryParams,
      );
      return res.data;
    },
  });
}

export function useGenerateEwayBill() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { invoiceId: string; data: any }>({
    mutationFn: async ({ invoiceId, data }) => {
      const res = await api.post<ApiResponse<any>>(
        `/eway-bill/generate/${invoiceId}`,
        data,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eway-bill"] });
      queryClient.invalidateQueries({ queryKey: ["einvoice"] });
    },
  });
}

export function useCancelEwayBill() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { invoiceId: string; reason: string; remarks: string }>({
    mutationFn: async ({ invoiceId, reason, remarks }) => {
      const res = await api.post<ApiResponse<any>>(
        `/eway-bill/cancel/${invoiceId}`,
        { reason, remarks },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eway-bill"] });
    },
  });
}

export function useExtendEwayBill() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { invoiceId: string; data: any }>({
    mutationFn: async ({ invoiceId, data }) => {
      const res = await api.patch<ApiResponse<any>>(
        `/eway-bill/${invoiceId}/extend`,
        data,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eway-bill"] });
    },
  });
}

// ─── Settings Hooks ────────────────────────────────────────────

export function useGspSettings() {
  return useQuery<GspSettings>({
    queryKey: ["einvoice", "settings"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<GspSettings>>("/einvoice/settings");
      return res.data;
    },
  });
}

export function useUpdateGspSettings() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, Partial<GspSettings>>({
    mutationFn: async (data) => {
      const res = await api.patch<ApiResponse<any>>("/einvoice/settings", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["einvoice", "settings"] });
    },
  });
}
