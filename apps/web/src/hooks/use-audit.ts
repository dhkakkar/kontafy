import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  org_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  entityType?: string;
  action?: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditFilterOptions {
  entityTypes: string[];
  actions: string[];
  userIds: string[];
}

// ─── API Response Wrapper ────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

// ─── Hooks ────────────────────────────────────────────────────

export function useAuditLog(filters: AuditLogFilters = {}) {
  const params: Record<string, string> = {};

  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.userId) params.userId = filters.userId;
  if (filters.entityType) params.entityType = filters.entityType;
  if (filters.action) params.action = filters.action;

  return useQuery<AuditLogResponse>({
    queryKey: ["audit", "log", filters],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AuditLogResponse>>("/audit", params);
      // The response interceptor wraps in { data: { data, meta } }
      // so res.data contains our paginated response
      return res.data as unknown as AuditLogResponse;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAuditFilterOptions() {
  return useQuery<AuditFilterOptions>({
    queryKey: ["audit", "filters"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AuditFilterOptions>>("/audit/filters");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // Cache filter options for 5 minutes
  });
}

export function useEntityHistory(entityType?: string, entityId?: string) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ["audit", "entity", entityType, entityId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AuditLogEntry[]>>(
        `/audit/${entityType}/${entityId}`,
      );
      return res.data;
    },
    enabled: !!entityType && !!entityId,
  });
}

// ─── Export helper ────────────────────────────────────────────

export function buildAuditExportUrl(filters: AuditLogFilters = {}): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const url = new URL(`${baseUrl}/audit/export`);

  if (filters.startDate) url.searchParams.set("startDate", filters.startDate);
  if (filters.endDate) url.searchParams.set("endDate", filters.endDate);
  if (filters.userId) url.searchParams.set("userId", filters.userId);
  if (filters.entityType) url.searchParams.set("entityType", filters.entityType);
  if (filters.action) url.searchParams.set("action", filters.action);

  return url.toString();
}
