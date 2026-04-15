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
import { api } from "@/lib/api";
import { Plus, Search, Download, Loader2, FileText } from "lucide-react";

interface DebitNote {
  id: string;
  invoice_number: string;
  contact_name?: string;
  contact?: { name: string };
  date: string;
  original_bill_number?: string;
  amount: number;
  status: "draft" | "issued" | "applied" | "cancelled";
  reason?: "return" | "discount" | "correction" | "other";
}

const reasonLabelMap: Record<string, { label: string; color: string }> = {
  return: { label: "Purchase Return", color: "text-orange-600 bg-orange-50" },
  discount: { label: "Discount", color: "text-blue-600 bg-blue-50" },
  correction: { label: "Correction", color: "text-purple-600 bg-purple-50" },
  other: { label: "Other", color: "text-gray-600 bg-gray-50" },
};

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  issued: { variant: "info", label: "Issued" },
  applied: { variant: "success", label: "Applied" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const columnHelper = createColumnHelper<DebitNote>();

export default function DebitNotesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["debit-notes", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.status = activeTab;
      if (searchQuery) params.search = searchQuery;
      params.type = "debit_note";
      const res = await api.get<{ data: DebitNote[] }>("/bill/invoices", params);
      return res.data;
    },
  });

  const debitNotes = data || [];

  const tabs = [
    { value: "all", label: "All", count: debitNotes.length },
    { value: "draft", label: "Draft", count: debitNotes.filter((d) => d.status === "draft").length },
    { value: "issued", label: "Issued", count: debitNotes.filter((d) => d.status === "issued").length },
    { value: "applied", label: "Applied", count: debitNotes.filter((d) => d.status === "applied").length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("invoice_number", {
        header: "Debit Note #",
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
            {info.row.original.contact?.name || info.row.original.contact_name || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("original_bill_number", {
        header: "Original Bill",
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
            {formatCurrency(Number(info.getValue()))}
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
    data: debitNotes,
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
          <h1 className="text-2xl font-bold text-gray-900">Debit Notes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage debit notes for purchase returns
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
          <Link href="/debit-notes/new">
            <Button icon={<Plus className="h-4 w-4" />}>
              New Debit Note
            </Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200 flex items-end gap-4 flex-wrap">
          <Input
            placeholder="Search by vendor or debit note number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading debit notes...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-red-500">Failed to load debit notes. Please try again.</p>
          </div>
        ) : debitNotes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No debit notes found</p>
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/debit-notes/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
