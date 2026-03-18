"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ClipboardList,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import {
  useAuditLog,
  useAuditFilterOptions,
  buildAuditExportUrl,
  type AuditLogEntry,
  type AuditLogFilters,
} from "@/hooks/use-audit";

// ─── Action Badge Styling ────────────────────────────────

function actionBadge(action: string) {
  const base = action.replace(".failed", "");
  const failed = action.includes(".failed");

  if (failed) {
    return { variant: "danger" as const, label: `${base} (failed)` };
  }

  switch (base) {
    case "created":
      return { variant: "success" as const, label: "Created" };
    case "updated":
      return { variant: "info" as const, label: "Updated" };
    case "deleted":
      return { variant: "danger" as const, label: "Deleted" };
    default:
      return { variant: "default" as const, label: action };
  }
}

function actionIcon(action: string) {
  const base = action.replace(".failed", "");
  switch (base) {
    case "created":
      return <Plus className="h-3.5 w-3.5" />;
    case "updated":
      return <Pencil className="h-3.5 w-3.5" />;
    case "deleted":
      return <Trash2 className="h-3.5 w-3.5" />;
    default:
      return <ClipboardList className="h-3.5 w-3.5" />;
  }
}

// ─── Entity type display ─────────────────────────────────

function formatEntityType(type: string | null): string {
  if (!type) return "-";
  return type
    .replace(/\./g, " > ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

// ─── Changes Diff Display ────────────────────────────────

function ChangesDiff({ changes }: { changes: Record<string, any> | null }) {
  if (!changes) return <span className="text-gray-400">-</span>;

  // Filter out metadata keys
  const metadataKeys = ["method", "path", "statusCode", "error"];
  const changeEntries = Object.entries(changes).filter(
    ([key]) => !metadataKeys.includes(key)
  );

  if (changeEntries.length === 0) {
    return <span className="text-gray-400">No field changes</span>;
  }

  const maxShow = 3;
  const shown = changeEntries.slice(0, maxShow);
  const remaining = changeEntries.length - maxShow;

  return (
    <div className="space-y-0.5">
      {shown.map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="font-medium text-gray-600">{key}:</span>{" "}
          <span className="text-gray-500">
            {typeof value === "object"
              ? JSON.stringify(value).slice(0, 50)
              : String(value).slice(0, 50)}
          </span>
        </div>
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-400">+{remaining} more</span>
      )}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────

export default function AuditLogPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 25,
  });
  const [searchEntity, setSearchEntity] = useState("");

  const { data: auditData, isLoading, error } = useAuditLog(filters);
  const { data: filterOptions } = useAuditFilterOptions();

  const entries = auditData?.data || [];
  const meta = auditData?.meta;

  const updateFilter = useCallback(
    (key: keyof AuditLogFilters, value: string | number | undefined) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value || undefined,
        page: key === "page" ? (value as number) : 1, // Reset page on filter change
      }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, limit: 25 });
    setSearchEntity("");
  }, []);

  const hasActiveFilters =
    filters.startDate ||
    filters.endDate ||
    filters.userId ||
    filters.entityType ||
    filters.action;

  // ─── Export ─────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const url = buildAuditExportUrl(filters);
    const token = localStorage.getItem("access_token");
    const orgId = localStorage.getItem("org_id");

    // Use fetch to download with auth headers
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": orgId || "",
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch((err) => console.error("Export failed:", err));
  }, [filters]);

  // ─── Table Columns ─────────────────────────────────────

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Timestamp",
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <div className="text-sm text-gray-900">
              {formatDate(row.original.created_at, "DD MMM YYYY")}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(row.original.created_at, "hh:mm:ss A")}
            </div>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "user_id",
        header: "User",
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 font-mono">
            {row.original.user_id
              ? row.original.user_id.slice(0, 8) + "..."
              : "-"}
          </span>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => {
          const { variant, label } = actionBadge(row.original.action);
          return (
            <div className="flex items-center gap-2">
              {actionIcon(row.original.action)}
              <Badge variant={variant}>{label}</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "entity_type",
        header: "Entity Type",
        cell: ({ row }) => (
          <span className="text-sm text-gray-700">
            {formatEntityType(row.original.entity_type)}
          </span>
        ),
      },
      {
        accessorKey: "entity_id",
        header: "Entity",
        cell: ({ row }) =>
          row.original.entity_id ? (
            <span className="text-sm font-mono text-primary-700 flex items-center gap-1">
              {row.original.entity_id.slice(0, 8)}...
              <ExternalLink className="h-3 w-3" />
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        accessorKey: "changes",
        header: "Changes",
        cell: ({ row }) => <ChangesDiff changes={row.original.changes} />,
        enableSorting: false,
      },
      {
        accessorKey: "ip_address",
        header: "IP",
        cell: ({ row }) => (
          <span className="text-xs text-gray-500 font-mono">
            {row.original.ip_address || "-"}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: meta?.totalPages || 0,
  });

  // ─── Filter option lists ───────────────────────────────

  const entityTypeOptions = [
    { value: "", label: "All entity types" },
    ...(filterOptions?.entityTypes || []).map((t) => ({
      value: t,
      label: formatEntityType(t),
    })),
  ];

  const actionOptions = [
    { value: "", label: "All actions" },
    ...(filterOptions?.actions || []).map((a) => ({
      value: a,
      label: a.charAt(0).toUpperCase() + a.slice(1),
    })),
  ];

  const userOptions = [
    { value: "", label: "All users" },
    ...(filterOptions?.userIds || []).map((u) => ({
      value: u,
      label: u.slice(0, 8) + "...",
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete activity trail for your organization
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            type="date"
            label="From"
            value={filters.startDate || ""}
            onChange={(e) => updateFilter("startDate", e.target.value)}
          />
          <Input
            type="date"
            label="To"
            value={filters.endDate || ""}
            onChange={(e) => updateFilter("endDate", e.target.value)}
          />
          <Select
            label="Entity Type"
            options={entityTypeOptions}
            value={filters.entityType || ""}
            onChange={(v) => updateFilter("entityType", v)}
          />
          <Select
            label="Action"
            options={actionOptions}
            value={filters.action || ""}
            onChange={(v) => updateFilter("action", v)}
          />
          <Select
            label="User"
            options={userOptions}
            value={filters.userId || ""}
            onChange={(v) => updateFilter("userId", v)}
            searchable
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={clearFilters}
              className="text-xs text-primary-700 hover:text-primary-800 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
            {meta && (
              <span className="text-xs text-gray-500">
                {meta.total} result{meta.total !== 1 ? "s" : ""} found
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-danger-200 bg-danger-50">
          <AlertCircle className="h-5 w-5 text-danger-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-danger-700">
              Failed to load audit log
            </p>
            <p className="text-xs text-danger-600 mt-0.5">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading audit log...
            </div>
          </div>
        ) : entries.length === 0 && !hasActiveFilters ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-700">
              No audit entries yet
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Activity will be logged automatically as your team uses the
              platform.
            </p>
          </div>
        ) : (
          <>
            <DataTable table={table} />

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {(meta.page - 1) * meta.limit + 1} to{" "}
                  {Math.min(meta.page * meta.limit, meta.total)} of{" "}
                  {meta.total} entries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateFilter("page", meta.page - 1)}
                    disabled={meta.page <= 1}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      meta.page <= 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                    // Show pages around current page
                    let pageNum: number;
                    if (meta.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (meta.page <= 3) {
                      pageNum = i + 1;
                    } else if (meta.page >= meta.totalPages - 2) {
                      pageNum = meta.totalPages - 4 + i;
                    } else {
                      pageNum = meta.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => updateFilter("page", pageNum)}
                        className={cn(
                          "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                          pageNum === meta.page
                            ? "bg-primary-50 text-primary-800"
                            : "text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => updateFilter("page", meta.page + 1)}
                    disabled={meta.page >= meta.totalPages}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      meta.page >= meta.totalPages
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
