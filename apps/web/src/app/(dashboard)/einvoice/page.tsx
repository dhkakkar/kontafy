"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileCheck,
  Clock,
  AlertTriangle,
  Truck,
  Search,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  useEInvoiceDashboard,
  useEInvoiceList,
  type EInvoiceListItem,
} from "@/hooks/use-einvoice";

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  generated: { variant: "success", label: "Generated" },
  pending: { variant: "warning", label: "Pending" },
  cancelled: { variant: "danger", label: "Cancelled" },
  failed: { variant: "danger", label: "Failed" },
};

const columnHelper = createColumnHelper<EInvoiceListItem>();

export default function EInvoiceDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: stats, isLoading: statsLoading } = useEInvoiceDashboard();
  const { data: listData, isLoading: listLoading } = useEInvoiceList({
    page,
    limit: 20,
    status: activeTab !== "all" ? activeTab : undefined,
    search: searchQuery || undefined,
  });

  const statCards = [
    {
      title: "Generated",
      value: stats?.generated ?? 0,
      icon: FileCheck,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Pending",
      value: stats?.pending ?? 0,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "Total Eligible",
      value: stats?.total_eligible ?? 0,
      icon: AlertTriangle,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "E-Way Bills",
      value: stats?.eway_bills_generated ?? 0,
      icon: Truck,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  const tabs = [
    { value: "all", label: "All" },
    { value: "generated", label: "Generated" },
    { value: "pending", label: "Pending" },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("invoice_number", {
        header: "Invoice #",
        cell: (info) => (
          <span className="font-medium text-primary-800">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("contact_name", {
        header: "Customer",
        cell: (info) => (
          <span className="text-gray-900">{info.getValue() || "N/A"}</span>
        ),
      }),
      columnHelper.accessor("date", {
        header: "Date",
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
      columnHelper.accessor("contact_gstin", {
        header: "GSTIN",
        cell: (info) => (
          <span className="text-xs text-gray-500 font-mono">
            {info.getValue() || "N/A"}
          </span>
        ),
      }),
      columnHelper.accessor("einvoice_status", {
        header: "E-Invoice",
        cell: (info) => {
          const s = statusBadgeMap[info.getValue()] || statusBadgeMap.pending;
          return (
            <Badge variant={s.variant} dot>
              {s.label}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("irn", {
        header: "IRN",
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="text-xs text-gray-500 font-mono truncate max-w-[120px] block">
              {val.substring(0, 20)}...
            </span>
          ) : (
            <span className="text-gray-400">--</span>
          );
        },
      }),
      columnHelper.accessor("eway_bill_no", {
        header: "E-Way Bill",
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <Badge variant="info" dot>
              {val}
            </Badge>
          ) : (
            <span className="text-gray-400">--</span>
          );
        },
      }),
    ],
    [],
  );

  const tableData = listData?.data ?? [];

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-Invoicing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and manage NIC e-invoices and e-way bills
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/einvoice/eway-bills">
            <Button variant="outline" size="sm" icon={<Truck className="h-4 w-4" />}>
              E-Way Bills
            </Button>
          </Link>
          <Link href="/einvoice/settings">
            <Button variant="outline" size="sm">
              Settings
            </Button>
          </Link>
          <Link href="/einvoice/generate">
            <Button icon={<Plus className="h-4 w-4" />}>Generate</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <div className="flex items-center gap-4">
              <div
                className={`h-11 w-11 rounded-lg flex items-center justify-center ${stat.color}`}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <span className="inline-block w-12 h-7 bg-gray-200 animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Pending */}
      {stats?.recent_pending && stats.recent_pending.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Recent Pending E-Invoices
          </h3>
          <div className="space-y-2">
            {stats.recent_pending.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/einvoice/${inv.id}`)}
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {inv.invoice_number}
                  </span>
                  <span className="text-sm text-gray-500 ml-3">
                    {inv.contact_name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(inv.total)}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatDate(inv.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* E-Invoice List */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by invoice number, IRN, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {listLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/einvoice/${row.id}`)}
          />
        )}

        {listData?.meta && listData.meta.total_pages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {listData.meta.page} of {listData.meta.total_pages} ({listData.meta.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= listData.meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
