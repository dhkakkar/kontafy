"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Plus, Search, Download, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface CreditNote {
  id: string;
  invoice_number: string;
  contact_name?: string;
  contact?: { name: string };
  date: string;
  original_invoice_number?: string;
  amount: number;
  status: "draft" | "issued" | "applied" | "cancelled";
  reason?: "return" | "discount" | "correction" | "other";
}

const reasonLabelMap: Record<string, { label: string; color: string }> = {
  return: { label: "Sale Return", color: "text-orange-600 bg-orange-50" },
  discount: { label: "Discount", color: "text-blue-600 bg-blue-50" },
  correction: { label: "Correction", color: "text-purple-600 bg-purple-50" },
  other: { label: "Other", color: "text-gray-600 bg-gray-50" },
};

interface ApiResponse<T> {
  data: T;
  meta?: { total?: number; page?: number; limit?: number };
}

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  issued: { variant: "info", label: "Issued" },
  applied: { variant: "success", label: "Applied" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const columnHelper = createColumnHelper<CreditNote>();

export default function CreditNotesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: creditNotes = [], isLoading, error } = useQuery<CreditNote[]>({
    queryKey: ["credit-notes", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.status = activeTab;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get<ApiResponse<CreditNote[]>>("/bill/credit-notes", params);
      return res.data;
    },
  });

  const tabs = [
    { value: "all", label: "All", count: creditNotes.length },
    { value: "draft", label: "Draft", count: creditNotes.filter((c) => c.status === "draft").length },
    { value: "issued", label: "Issued", count: creditNotes.filter((c) => c.status === "issued").length },
    { value: "applied", label: "Applied", count: creditNotes.filter((c) => c.status === "applied").length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("invoice_number", {
        header: "Credit Note #",
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
      columnHelper.accessor("original_invoice_number", {
        header: "Original Invoice",
        cell: (info) => (
          <span className="text-gray-600">
            {info.getValue() || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("reason", {
        header: "Reason",
        cell: (info) => {
          const r = reasonLabelMap[info.getValue() || ""] || reasonLabelMap.other;
          return info.getValue() ? (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.color}`}>
              {r.label}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          );
        },
      }),
      columnHelper.accessor("amount", {
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
    ],
    []
  );

  const table = useReactTable({
    data: creditNotes,
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
          <h1 className="text-2xl font-bold text-gray-900">Credit Notes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage credit notes for returns and adjustments
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
          <Link href="/credit-notes/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Credit Note</Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by customer or credit note number..."
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
            Failed to load credit notes. Please try again.
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No credit notes found</p>
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/credit-notes/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
