import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

export type CaPermission =
  | "view_reports"
  | "view_invoices"
  | "view_gst"
  | "approve_entries"
  | "download_data";

export interface CaClient {
  orgId: string;
  name: string;
  legalName: string | null;
  gstin: string | null;
  businessType: string | null;
  permissions: CaPermission[];
  joinedAt: string;
}

export interface CaClientSummary {
  organization: {
    id: string;
    name: string;
    legalName: string | null;
    gstin: string | null;
    pan: string | null;
    businessType: string | null;
    fiscalYearStart: number;
  };
  summary: {
    revenueThisMonth: number;
    expensesThisMonth: number;
    receivables: { total: number; count: number };
    payables: { total: number; count: number };
    journalEntriesThisMonth: number;
  };
}

export interface CaAnnotation {
  id: string;
  org_id: string;
  ca_user_id: string;
  entity_type: string;
  entity_id: string;
  comment: string;
  created_at: string;
}

export interface ApprovalEntry {
  id: string;
  entryNumber: number;
  date: string;
  narration: string | null;
  reference: string | null;
  referenceType: string | null;
  createdAt: string;
  lines: Array<{
    accountName: string;
    accountCode: string | null;
    accountType: string;
    debit: number;
    credit: number;
    description: string | null;
  }>;
  totalDebit: number;
  totalCredit: number;
}

export interface ConnectedCA {
  userId: string;
  permissions: CaPermission[];
  joinedAt: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  permissions: CaPermission[];
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface ConnectedCAsResponse {
  activeCAs: ConnectedCA[];
  pendingInvitations: PendingInvitation[];
}

export interface ExportData {
  organization: { name: string; gstin: string | null; pan: string | null };
  fiscalYear: string;
  generatedAt: string;
  trialBalance: Array<{
    code: string | null;
    name: string;
    type: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  profitAndLoss: { totalIncome: number; totalExpenses: number; netProfit: number };
  balanceSheet: { assets: number; liabilities: number; equity: number };
  gstReturns: Array<{
    returnType: string;
    period: string;
    status: string;
    filedAt: string | null;
    arn: string | null;
  }>;
  invoiceSummary: {
    totalSales: number;
    totalPurchases: number;
    salesValue: number;
    purchaseValue: number;
  };
  journalEntryCount: number;
}

// ─── API Response Wrapper ────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

// ─── Business-Side Hooks ─────────────────────────────────────

export function useConnectedCAs() {
  return useQuery<ConnectedCAsResponse>({
    queryKey: ["ca", "connected"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ConnectedCAsResponse>>("/ca/connected");
      return res.data;
    },
  });
}

export function useInviteCA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; permissions: CaPermission[] }) => {
      return api.post("/ca/invite", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ca", "connected"] });
    },
  });
}

export function useRevokeCA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/ca/revoke/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ca", "connected"] });
    },
  });
}

// ─── CA-Side Hooks ───────────────────────────────────────────

export function useCaClients() {
  return useQuery<CaClient[]>({
    queryKey: ["ca", "clients"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CaClient[]>>("/ca/clients");
      return res.data;
    },
  });
}

export function useCaClientSummary(orgId: string) {
  return useQuery<CaClientSummary>({
    queryKey: ["ca", "clients", orgId, "summary"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CaClientSummary>>(
        `/ca/clients/${orgId}/summary`
      );
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useCaExportData(orgId: string, fy: string) {
  return useQuery<ExportData>({
    queryKey: ["ca", "clients", orgId, "export", fy],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ExportData>>(
        `/ca/clients/${orgId}/export`,
        { fy }
      );
      return res.data;
    },
    enabled: false, // Only fetch on demand
  });
}

export function useCaAnnotations(orgId: string, entityType?: string, entityId?: string) {
  return useQuery<CaAnnotation[]>({
    queryKey: ["ca", "annotations", orgId, entityType, entityId],
    queryFn: async () => {
      const params: Record<string, string> = { orgId };
      if (entityType) params.entityType = entityType;
      if (entityId) params.entityId = entityId;
      const res = await api.get<ApiResponse<CaAnnotation[]>>("/ca/annotations", params);
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useAddAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      orgId: string;
      entityType: string;
      entityId: string;
      comment: string;
    }) => {
      return api.post("/ca/annotations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ca", "annotations"] });
    },
  });
}

export function useCaApprovals(orgId: string) {
  return useQuery<ApprovalEntry[]>({
    queryKey: ["ca", "approvals", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ApprovalEntry[]>>("/ca/approvals", { orgId });
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useApproveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      journalEntryId: string;
      orgId: string;
      approved: boolean;
      comment?: string;
    }) => {
      return api.post(`/ca/approvals/${data.journalEntryId}`, {
        orgId: data.orgId,
        approved: data.approved,
        comment: data.comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ca", "approvals"] });
      queryClient.invalidateQueries({ queryKey: ["ca", "annotations"] });
    },
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async (token: string) => {
      return api.post("/ca/accept-invite", { token });
    },
  });
}
