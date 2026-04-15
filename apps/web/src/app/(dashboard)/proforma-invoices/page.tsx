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
import { Plus, Search, Download, Upload, Loader2, FileText } from "lucide-react";

interface ProformaInvoice {
  id: string;
  quotation_number: string;
  contact_name?: string;
  contact?: { name: string };
  date: string;
  validity_date?: string;
  total: number;
  status: "draft" | "sent" | "accepted" | "converted" | "expired" | "cancelled";
}

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  accepted: { variant: "success", label: "Accepted" },
  converted: { variant: "success", label: "Converted" },
  expired: { variant: "warning", label: "Expired" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const columnHelper = createColumnHelper<ProformaInvoice>();

export default function ProformaInvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: allQuotations = [], isLoading } = useQuery<ProformaInvoice[]>({
    queryKey: ["proforma-invoices", searchQuery],
    queryFn: async () => {
      const qp: Record<string, string> = { limit: "500" };
      if (searchQuery) qp.search = searchQuery;
      const res = await api.get<{ data: ProformaInvoice[] }>("/quotations", qp);
      return res.data;
    },
  });

  const proformaInvoices = useMemo(() => {
    if (activeTab === "all") return allQuotations;
    return allQuotations.filter((p) => p.status === activeTab);
  }, [allQuotations, activeTab]);

  const tabs = [
    { value: "all", label: "All", count: allQuotations.length },
    { value: "draft", label: "Draft", count: allQuotations.filter((p) => p.status === "draft").length },
    { value: "sent", label: "Sent", count: allQuotations.filter((p) => p.status === "sent").length },
    { value: "accepted", label: "Accepted", count: allQuotations.filter((p) => p.status === "accepted").length },
    { value: "expired", label: "Expired", count: allQuotations.filter((p) => p.status === "expired").length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("quotation_number", {
        header: "Proforma #",
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
    data: proformaInvoices,
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
          <h1 className="text-2xl font-bold text-gray-900">Proforma Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Send preliminary invoices before final billing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings/import?type=contacts">
            <Button
              variant="outline"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
            >
              Import
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Link href="/proforma-invoices/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Proforma</Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200 flex items-end gap-4 flex-wrap">
          <Input
            placeholder="Search by customer or proforma number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : proformaInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No proforma invoices found</p>
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/proforma-invoices/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
