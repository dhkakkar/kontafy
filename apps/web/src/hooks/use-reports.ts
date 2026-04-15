import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface GeneralLedgerData {
  from_date: string | null;
  to_date: string | null;
  accounts: Array<{
    account: {
      id: string;
      code: string;
      name: string;
      type: string;
      sub_type: string;
    };
    opening_balance: number;
    transactions: Array<{
      date: string;
      entry_number: number;
      narration: string | null;
      reference: string | null;
      reference_type: string | null;
      description: string | null;
      debit: number;
      credit: number;
      balance: number;
    }>;
    closing_balance: number;
    total_debit: number;
    total_credit: number;
  }>;
}

export interface DayBookData {
  from_date: string;
  to_date: string;
  entries: Array<{
    id: string;
    entry_number: number;
    date: string;
    narration: string | null;
    reference: string | null;
    reference_type: string | null;
    lines: Array<{
      account_id: string;
      account_code: string;
      account_name: string;
      account_type: string;
      description: string | null;
      debit: number;
      credit: number;
    }>;
  }>;
  totals: {
    entries_count: number;
    debit: number;
    credit: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface AgingBucket {
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total: number;
}

export interface AgingData {
  as_of: string;
  buckets: AgingBucket[];
  totals: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
    total: number;
  };
}

export interface RegisterEntry {
  id: string;
  invoice_number: string;
  date: string;
  status: string;
  contact: {
    id: string;
    name: string;
    company_name: string | null;
    gstin: string | null;
  } | null;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  items: Array<{
    description: string;
    product: any;
    hsn_code: string;
    quantity: number;
    rate: number;
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  }>;
}

export interface RegisterData {
  from_date: string;
  to_date: string;
  group_by: string;
  entries: RegisterEntry[];
  grouped: any[];
  totals: {
    invoice_count: number;
    subtotal: number;
    discount: number;
    tax_amount: number;
    total: number;
    amount_paid: number;
    balance_due: number;
  };
}

export interface StockSummaryItem {
  product_id: string;
  name: string;
  sku: string | null;
  unit: string;
  hsn_code: string | null;
  purchase_price: number;
  selling_price: number;
  reorder_level: number;
  total_quantity: number;
  total_stock_value: number;
  total_selling_value: number;
  below_reorder: boolean;
  warehouses: Array<{
    warehouse_id: string;
    warehouse_name: string;
    is_default: boolean;
    quantity: number;
    stock_value: number;
  }>;
}

export interface StockSummaryData {
  items: StockSummaryItem[];
  totals: {
    total_items: number;
    total_quantity: number;
    total_stock_value: number;
    total_selling_value: number;
    below_reorder_count: number;
  };
}

export interface StockMovementData {
  from_date: string;
  to_date: string;
  entries: Array<{
    id: string;
    date: string;
    product: { id: string; name: string; sku: string; unit: string };
    warehouse: { id: string; name: string };
    type: string;
    quantity: number;
    cost_price: number;
    reference_type: string | null;
    batch_number: string | null;
    serial_number: string | null;
    notes: string | null;
  }>;
  summary_by_type: Array<{
    type: string;
    count: number;
    total_quantity: number;
  }>;
  summary_by_product: Array<{
    product_id: string;
    product_name: string;
    total_in: number;
    total_out: number;
    net: number;
  }>;
  totals: { total_movements: number };
}

export interface GstSummaryData {
  from_date: string;
  to_date: string;
  output_tax: {
    invoice_count: number;
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
    rate_wise: Array<{
      rate: number;
      taxable_amount: number;
      cgst: number;
      sgst: number;
      igst: number;
      cess: number;
      total_tax: number;
    }>;
  };
  input_tax: {
    invoice_count: number;
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
    rate_wise: Array<{
      rate: number;
      taxable_amount: number;
      cgst: number;
      sgst: number;
      igst: number;
      cess: number;
      total_tax: number;
    }>;
  };
  net_liability: {
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total: number;
  };
}

export interface TdsSummaryData {
  from_date: string;
  to_date: string;
  entries: Array<{
    id: string;
    date: string;
    section: string;
    contact: {
      id: string;
      name: string;
      company_name: string | null;
      pan: string | null;
    } | null;
    gross_amount: number;
    tds_rate: number;
    tds_amount: number;
    status: string;
  }>;
  section_summary: Array<{
    section: string;
    entry_count: number;
    total_gross_amount: number;
    total_tds_amount: number;
    entries_pending: number;
    entries_deposited: number;
  }>;
  deductee_summary: Array<{
    contact_id: string;
    name: string;
    pan: string | null;
    total_gross_amount: number;
    total_tds_amount: number;
    entry_count: number;
  }>;
  totals: {
    entry_count: number;
    total_gross_amount: number;
    total_tds_amount: number;
    pending_count: number;
    deposited_count: number;
    pending_amount: number;
  };
}

// ─── Hooks ────────────────────────────────────────────────────

export function useGeneralLedger(params: {
  fromDate?: string;
  toDate?: string;
  accountId?: string;
  accountType?: string;
}) {
  return useQuery<GeneralLedgerData>({
    queryKey: ["reports", "general-ledger", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params.fromDate) queryParams.fromDate = params.fromDate;
      if (params.toDate) queryParams.toDate = params.toDate;
      if (params.accountId) queryParams.accountId = params.accountId;
      if (params.accountType) queryParams.accountType = params.accountType;

      const res = await api.get<ApiResponse<GeneralLedgerData>>(
        "/reports/general-ledger",
        queryParams,
      );
      return res.data;
    },
    enabled: !!params.fromDate && !!params.toDate,
  });
}

export function useDayBook(params: {
  fromDate: string;
  toDate: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<DayBookData>({
    queryKey: ["reports", "day-book", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        fromDate: params.fromDate,
        toDate: params.toDate,
      };
      if (params.page) queryParams.page = String(params.page);
      if (params.limit) queryParams.limit = String(params.limit);

      const res = await api.get<ApiResponse<DayBookData>>(
        "/reports/day-book",
        queryParams,
      );
      return res.data;
    },
    enabled: !!params.fromDate && !!params.toDate,
  });
}

export function useReceivableAging(params: {
  asOfDate?: string;
  contactId?: string;
}) {
  return useQuery<AgingData>({
    queryKey: ["reports", "receivable-aging", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params.asOfDate) queryParams.asOfDate = params.asOfDate;
      if (params.contactId) queryParams.contactId = params.contactId;

      const res = await api.get<ApiResponse<AgingData>>(
        "/reports/receivable-aging",
        queryParams,
      );
      return res.data;
    },
  });
}

export function usePayableAging(params: {
  asOfDate?: string;
  contactId?: string;
}) {
  return useQuery<AgingData>({
    queryKey: ["reports", "payable-aging", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params.asOfDate) queryParams.asOfDate = params.asOfDate;
      if (params.contactId) queryParams.contactId = params.contactId;

      const res = await api.get<ApiResponse<AgingData>>(
        "/reports/payable-aging",
        queryParams,
      );
      return res.data;
    },
  });
}

export function useSalesRegister(params: {
  fromDate: string;
  toDate: string;
  contactId?: string;
  groupBy?: string;
}) {
  return useQuery<RegisterData>({
    queryKey: ["reports", "sales-register", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        fromDate: params.fromDate,
        toDate: params.toDate,
      };
      if (params.contactId) queryParams.contactId = params.contactId;
      if (params.groupBy) queryParams.groupBy = params.groupBy;

      const res = await api.get<ApiResponse<RegisterData>>(
        "/reports/sales-register",
        queryParams,
      );
      return res.data;
    },
    enabled: !!params.fromDate && !!params.toDate,
  });
}

export function usePurchaseRegister(params: {
  fromDate: string;
  toDate: string;
  contactId?: string;
  groupBy?: string;
}) {
  return useQuery<RegisterData>({
    queryKey: ["reports", "purchase-register", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        fromDate: params.fromDate,
        toDate: params.toDate,
      };
      if (params.contactId) queryParams.contactId = params.contactId;
      if (params.groupBy) queryParams.groupBy = params.groupBy;

      const res = await api.get<ApiResponse<RegisterData>>(
        "/reports/purchase-register",
        queryParams,
      );
      return res.data;
    },
    enabled: !!params.fromDate && !!params.toDate,
  });
}

export function useStockSummary(params?: {
  warehouseId?: string;
  productId?: string;
  belowReorder?: boolean;
}) {
  return useQuery<StockSummaryData>({
    queryKey: ["reports", "stock-summary", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params?.warehouseId) queryParams.warehouseId = params.warehouseId;
      if (params?.productId) queryParams.productId = params.productId;
      if (params?.belowReorder) queryParams.belowReorder = "true";

      const res = await api.get<ApiResponse<StockSummaryData>>(
        "/reports/stock-summary",
        queryParams,
      );
      return res.data;
    },
  });
}

export function useStockMovement(params: {
  fromDate: string;
  toDate: string;
  productId?: string;
  warehouseId?: string;
  type?: string;
}) {
  return useQuery<StockMovementData>({
    queryKey: ["reports", "stock-movement", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        fromDate: params.fromDate,
        toDate: params.toDate,
      };
      if (params.productId) queryParams.productId = params.productId;
      if (params.warehouseId) queryParams.warehouseId = params.warehouseId;
      if (params.type) queryParams.type = params.type;

      const res = await api.get<ApiResponse<StockMovementData>>(
        "/reports/stock-movement",
        queryParams,
      );
      return res.data;
    },
    enabled: !!params.fromDate && !!params.toDate,
  });
}

export function useGstSummary(params: { fromDate: string; toDate: string }) {
  return useQuery<GstSummaryData>({
    queryKey: ["reports", "gst-summary", params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<GstSummaryData>>(
        "/reports/gst-summary",
        { fromDate: params.fromDate, toDate: params.toDate },
      );
      return res.data;
    },
    enabled: !!params.fromDate && !!params.toDate,
  });
}

export function useTdsSummary(params: {
  fromDate: string;
  toDate: string;
  section?: string;
}) {
  return useQuery<TdsSummaryData>({
    queryKey: ["reports", "tds-summary", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        fromDate: params.fromDate,
        toDate: params.toDate,
      };
      if (params.section) queryParams.section = params.section;

      const res = await api.get<ApiResponse<TdsSummaryData>>(
        "/reports/tds-summary",
        queryParams,
      );
      return res.data;
    },
    enabled: !!params.fromDate && !!params.toDate,
  });
}

export function useExportReport() {
  return useMutation<Blob, Error, { reportType: string; format: string; filters?: Record<string, string> }>({
    mutationFn: async ({ reportType, format, filters }) => {
      // Get auth headers the same way ApiClient does
      let authToken = "";
      let orgId = "";
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        authToken = data.session?.access_token || "";
      } catch {}
      try {
        const stored = localStorage.getItem("kontafy-auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          orgId = parsed?.state?.organization?.id || "";
        }
      } catch {}

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      if (orgId) headers["X-Org-Id"] = orgId;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/reports/export`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ reportType, format, filters }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Export failed" }));
        throw new Error(error.message || "Export failed");
      }

      return response.blob();
    },
  });
}
