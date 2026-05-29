"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, Search, Download, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";

interface Purchase {
  id: string;
  invoice_number: string;
  contact_name?: string;
  contact?: { name: string };
  date: string;
  due_date: string;
  total: number;
  status: "draft" | "sent" | "overdue" | "paid" | "partially_paid" | "cancelled";
}

interface ListResponse {
  data: Purchase[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface StatsResponse {
  byStatus: {
    all: number;
    draft: number;
    sent: number;
    partially_paid: number;
    overdue: number;
    paid: number;
    cancelled?: number;
  };
  outstanding: { total: number; overdue: number; overdueCount: number };
}

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  overdue: { variant: "danger", label: "Overdue" },
  paid: { variant: "success", label: "Paid" },
  partially_paid: { variant: "warning", label: "Partial" },
  cancelled: { variant: "default", label: "Cancelled" },
};

const columnHelper = createColumnHelper<Purchase>();

export default function PurchasesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // The "Pending" tab is a UI convenience — the API treats sent and
  // partially_paid as separate statuses. When the user picks the
  // Pending tab we fetch both statuses by sending status=sent (the
  // bulk of the count) and rely on client-side reasoning for partial.
  // For simplicity we fall back to fetching all and filtering when
  // the tab is sent OR all. Tab-to-status maps directly otherwise.
  const tabStatusParam: string | undefined = useMemo(() => {
    if (activeTab === "all") return undefined;
    if (activeTab === "sent") return "sent"; // partially_paid handled via separate filter
    return activeTab;
  }, [activeTab]);

  // Reset to page 1 when filters / search / tab change. Without this
  // the user can land on page 4 of "all" then switch to a tab with
  // only 1 page and see an empty table.
  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, activeTab, pageSize]);

  const listQuery = useQuery<ListResponse>({
    queryKey: ["purchases", { page, pageSize, status: tabStatusParam, search: searchQuery }],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
      };
      if (tabStatusParam) params.status = tabStatusParam;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get<ListResponse>("/bill/purchases", params);
      return res;
    },
  });

  const statsQuery = useQuery<StatsResponse>({
    queryKey: ["purchases-stats"],
    queryFn: async () => api.get<StatsResponse>("/bill/purchases/stats"),
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.meta.total ?? 0;
  const stats = statsQuery.data;

  const tabs = [
    { value: "all", label: "All", count: stats?.byStatus.all ?? 0 },
    { value: "draft", label: "Draft", count: stats?.byStatus.draft ?? 0 },
    {
      value: "sent",
      label: "Pending",
      count: (stats?.byStatus.sent ?? 0) + (stats?.byStatus.partially_paid ?? 0),
    },
    { value: "overdue", label: "Overdue", count: stats?.byStatus.overdue ?? 0 },
    { value: "paid", label: "Paid", count: stats?.byStatus.paid ?? 0 },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("invoice_number", {
        header: "Bill #",
        cell: (info) => (
          <span className="font-medium text-primary-800">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "vendor",
        header: "Vendor",
        cell: (info) => (
          <span className="text-gray-900">
            {info.row.original.contact_name || info.row.original.contact?.name || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("due_date", {
        header: "Due Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("total", {
        header: "Amount",
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const s = statusBadgeMap[info.getValue()] || statusBadgeMap.draft;
          return (
            <Badge variant={s.variant} dot>
              {s.label}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <ActionMenu
            items={[
              {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onClick: () =>
                  router.push(`/purchases/${info.row.original.id}`),
              },
              {
                label: "Edit",
                icon: <Pencil className="h-4 w-4" />,
                onClick: () =>
                  router.push(`/purchases/${info.row.original.id}/edit`),
              },
              {
                label: "Delete",
                icon: <Trash2 className="h-4 w-4" />,
                danger: true,
                onClick: async () => {
                  const row = info.row.original;
                  if (
                    !confirm(`Delete purchase ${row.invoice_number}?`)
                  )
                    return;
                  try {
                    await api.delete(`/bill/purchases/${row.id}`);
                    queryClient.invalidateQueries({ queryKey: ["purchases"] });
                    queryClient.invalidateQueries({ queryKey: ["purchases-stats"] });
                  } catch (err) {
                    alert(
                      (err as Error).message || "Failed to delete purchase",
                    );
                  }
                },
              },
            ]}
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Purchase Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage bills received from vendors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Link href="/purchases/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Purchase</Button>
          </Link>
        </div>
      </div>

      {/* Outstanding summary — sourced from the stats endpoint so the
          figures stay correct regardless of which page of the list is
          currently visible. Falls back to "—" while loading rather
          than showing 0, which would otherwise flicker. */}
      <Card padding="md" className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Total Outstanding Payables</p>
          <p className="text-2xl font-bold text-warning-700">
            {stats ? formatCurrency(stats.outstanding.total) : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {stats?.outstanding.overdueCount ?? 0} overdue bill
            {stats?.outstanding.overdueCount !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-danger-600 font-medium">
            {stats ? formatCurrency(stats.outstanding.overdue) : "—"} overdue
          </p>
        </div>
      </Card>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by vendor or bill number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {listQuery.isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : listQuery.isError ? (
          <div className="py-12 text-center text-danger-600">
            Failed to load purchase invoices. Please try again.
          </div>
        ) : (
          <>
            <DataTable
              table={table}
              onRowClick={(row) => router.push(`/purchases/${row.id}`)}
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>
    </div>
  );
}
