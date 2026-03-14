import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

export interface DashboardStats {
  revenue: { thisMonth: number; lastMonth: number; percentChange: number };
  expenses: { thisMonth: number; lastMonth: number; percentChange: number };
  receivables: { total: number; overdue: number; overdueCount: number };
  payables: { total: number; overdue: number; overdueCount: number };
  gstLiability: { currentPeriod: number; nextDueDate: string | null };
  cashPosition: { total: number };
}

export interface RevenueChartPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface CashFlowChartPoint {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface RecentTransaction {
  id: string;
  entryNumber: number;
  date: string;
  narration: string | null;
  reference: string | null;
  referenceType: string | null;
  amount: number;
  type: "income" | "expense" | "journal";
  lines: Array<{
    accountName: string;
    accountType: string;
    debit: number;
    credit: number;
    description: string | null;
  }>;
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  amount: number;
  total: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

export interface TopCustomer {
  contactId: string;
  name: string;
  revenue: number;
  invoiceCount: number;
}

// ─── API Response Wrapper ────────────────────────────────────
// The ResponseInterceptor wraps responses in { data, meta }

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

// ─── Hooks ────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardStats>>("/dashboard/stats");
      return res.data;
    },
  });
}

export function useRevenueChart(months: number = 6) {
  return useQuery<RevenueChartPoint[]>({
    queryKey: ["dashboard", "revenue-chart", months],
    queryFn: async () => {
      const res = await api.get<ApiResponse<RevenueChartPoint[]>>(
        "/dashboard/revenue-chart",
        { months: String(months) },
      );
      return res.data;
    },
  });
}

export function useCashFlowChart(months: number = 6) {
  return useQuery<CashFlowChartPoint[]>({
    queryKey: ["dashboard", "cash-flow-chart", months],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CashFlowChartPoint[]>>(
        "/dashboard/cash-flow-chart",
        { months: String(months) },
      );
      return res.data;
    },
  });
}

export function useRecentTransactions(limit: number = 10) {
  return useQuery<RecentTransaction[]>({
    queryKey: ["dashboard", "recent-transactions", limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<RecentTransaction[]>>(
        "/dashboard/recent-transactions",
        { limit: String(limit) },
      );
      return res.data;
    },
  });
}

export function useOverdueInvoices() {
  return useQuery<OverdueInvoice[]>({
    queryKey: ["dashboard", "overdue-invoices"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<OverdueInvoice[]>>("/dashboard/overdue-invoices");
      return res.data;
    },
  });
}

export function useTopCustomers(limit: number = 5) {
  return useQuery<TopCustomer[]>({
    queryKey: ["dashboard", "top-customers", limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TopCustomer[]>>(
        "/dashboard/top-customers",
        { limit: String(limit) },
      );
      return res.data;
    },
  });
}
