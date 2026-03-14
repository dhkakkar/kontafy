"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRecurringInvoices, type RecurringInvoice } from "@/hooks/use-recurring";
import { Plus, Search, RefreshCw } from "lucide-react";

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  paused: { variant: "warning", label: "Paused" },
  stopped: { variant: "default", label: "Stopped" },
};

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const columnHelper = createColumnHelper<RecurringInvoice>();

export default function RecurringInvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading } = useRecurringInvoices({
    status: activeTab !== "all" ? activeTab : undefined,
  });

  const items = data?.data || [];

  const filteredData = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.contact?.name?.toLowerCase().includes(q) ||
        r.contact?.company_name?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const tabs = [
    { value: "all", label: "All", count: items.length },
    { value: "active", label: "Active", count: items.filter((r) => r.status === "active").length },
    { value: "paused", label: "Paused", count: items.filter((r) => r.status === "paused").length },
    { value: "stopped", label: "Stopped", count: items.filter((r) => r.status === "stopped").length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Profile Name",
        cell: (info) => (
          <span className="font-medium text-primary-800">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "customer",
        header: "Customer",
        cell: (info) => (
          <span className="text-gray-900">
            {info.row.original.contact?.company_name || info.row.original.contact?.name || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("frequency", {
        header: "Frequency",
        cell: (info) => (
          <Badge variant="info">
            {frequencyLabels[info.getValue()] || info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("total", {
        header: "Amount",
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(Number(info.getValue()))}
          </span>
        ),
      }),
      columnHelper.accessor("next_issue_date", {
        header: "Next Date",
        cell: (info) => (
          <span className="text-gray-600">
            {info.getValue() ? formatDate(info.getValue()) : "-"}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const s = statusBadgeMap[info.getValue()] || statusBadgeMap.active;
          return (
            <Badge variant={s.variant} dot>
              {s.label}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("generation_count", {
        header: "Generated",
        cell: (info) => (
          <span className="text-gray-600 text-sm">
            {info.getValue() || 0} invoices
          </span>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
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
            Recurring Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automate recurring billing with invoice templates
          </p>
        </div>
        <Link href="/recurring-invoices/new">
          <Button icon={<Plus className="h-4 w-4" />}>
            New Recurring Invoice
          </Button>
        </Link>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by name or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="p-8">
            <div className="h-40 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recurring invoices found</p>
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/recurring-invoices/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
