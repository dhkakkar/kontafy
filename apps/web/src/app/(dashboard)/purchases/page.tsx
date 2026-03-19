"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { api } from "@/lib/api";
import { Plus, Search, Download, MoreHorizontal, Loader2 } from "lucide-react";

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

interface ApiResponse<T> {
  data: T;
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
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: purchases = [], isLoading, error } = useQuery<Purchase[]>({
    queryKey: ["purchases", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "all") {
        if (activeTab === "sent") {
          params.status = "sent,partially_paid";
        } else {
          params.status = activeTab;
        }
      }
      if (searchQuery) params.search = searchQuery;
      const res = await api.get<ApiResponse<Purchase[]>>("/bill/purchases", params);
      return res.data;
    },
  });

  const totalOutstanding = purchases
    .filter((p) => ["sent", "overdue", "partially_paid"].includes(p.status))
    .reduce((sum, p) => sum + p.total, 0);

  const tabs = [
    { value: "all", label: "All", count: purchases.length },
    { value: "draft", label: "Draft", count: purchases.filter((p) => p.status === "draft").length },
    {
      value: "sent",
      label: "Pending",
      count: purchases.filter((p) => p.status === "sent" || p.status === "partially_paid").length,
    },
    { value: "overdue", label: "Overdue", count: purchases.filter((p) => p.status === "overdue").length },
    { value: "paid", label: "Paid", count: purchases.filter((p) => p.status === "paid").length },
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
        cell: () => (
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: purchases,
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

      {/* Outstanding summary */}
      <Card padding="md" className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Total Outstanding Payables</p>
          <p className="text-2xl font-bold text-warning-700">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {purchases.filter((p) => p.status === "overdue").length} overdue bill
            {purchases.filter((p) => p.status === "overdue").length !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-danger-600 font-medium">
            {formatCurrency(
              purchases
                .filter((p) => p.status === "overdue")
                .reduce((s, p) => s + p.total, 0)
            )}{" "}
            overdue
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

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-danger-600">
            Failed to load purchase invoices. Please try again.
          </div>
        ) : (
          <DataTable table={table} />
        )}
      </Card>
    </div>
  );
}
