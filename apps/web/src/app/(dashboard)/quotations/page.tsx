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
import { useQuotations, type Quotation } from "@/hooks/use-quotations";
import { Plus, Search, Download, FileText } from "lucide-react";

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  accepted: { variant: "success", label: "Accepted" },
  converted: { variant: "success", label: "Converted" },
  invoiced: { variant: "success", label: "Invoiced" },
  rejected: { variant: "danger", label: "Rejected" },
  expired: { variant: "warning", label: "Expired" },
};

const columnHelper = createColumnHelper<Quotation>();

export default function QuotationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useQuotations({
    status: activeTab !== "all" ? activeTab : undefined,
    search: searchQuery || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  });

  const quotations = data?.data || [];

  const tabs = [
    { value: "all", label: "All", count: quotations.length },
    { value: "draft", label: "Draft", count: quotations.filter((q) => q.status === "draft").length },
    { value: "sent", label: "Sent", count: quotations.filter((q) => q.status === "sent").length },
    { value: "accepted", label: "Accepted", count: quotations.filter((q) => q.status === "accepted").length },
    { value: "rejected", label: "Rejected", count: quotations.filter((q) => q.status === "rejected").length },
    { value: "expired", label: "Expired", count: quotations.filter((q) => q.status === "expired").length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("quotation_number", {
        header: "Quotation #",
        cell: (info) => (
          <Link
            href={`/quotations/${info.row.original.id}`}
            className="font-medium text-primary-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {info.getValue()}
          </Link>
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
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("validity_date", {
        header: "Valid Until",
        cell: (info) => (
          <span className="text-gray-600">
            {info.getValue() ? formatDate(info.getValue()!) : "-"}
          </span>
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
    data: quotations,
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
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage sales quotations
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
          <Link href="/quotations/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Quotation</Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200 flex items-end gap-4 flex-wrap">
          <Input
            placeholder="Search by customer or quotation number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
          <div className="flex items-end gap-3">
            <Input
              label="From"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
            <Input
              label="To"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8">
            <div className="h-40 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No quotations found</p>
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/quotations/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
