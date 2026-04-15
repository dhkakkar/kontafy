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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, Download, Upload, MessageSquare, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { ActionMenu } from "@/components/ui/action-menu";

interface Invoice {
  id: string;
  invoice_number: string;
  contact_name?: string;
  contact?: { name: string };
  date: string;
  due_date: string;
  total: number;
  status: "draft" | "sent" | "overdue" | "paid" | "cancelled" | "partially_paid";
}

interface ApiResponse<T> {
  data: T;
  meta?: { total?: number; page?: number; limit?: number };
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

const columnHelper = createColumnHelper<Invoice>();

export default function InvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Delete invoice ${number}? This cannot be undone.`)) return;
    try {
      await api.delete(`/bill/invoices/${id}`);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (err) {
      alert((err as Error).message || "Failed to delete invoice");
    }
  };

  const { data: invoices = [], isLoading, error } = useQuery<Invoice[]>({
    queryKey: ["invoices", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.status = activeTab;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get<ApiResponse<Invoice[]>>("/bill/invoices", params);
      return res.data;
    },
  });

  const tabs = [
    { value: "all", label: "All", count: invoices.length },
    { value: "draft", label: "Draft", count: invoices.filter((i) => i.status === "draft").length },
    { value: "sent", label: "Sent", count: invoices.filter((i) => i.status === "sent").length },
    { value: "overdue", label: "Overdue", count: invoices.filter((i) => i.status === "overdue").length },
    { value: "paid", label: "Paid", count: invoices.filter((i) => i.status === "paid").length },
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
          <div className="flex items-center gap-1">
            <button
              title="Send via WhatsApp"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const phone = prompt("Enter WhatsApp number (with country code, e.g. 919876543210):");
                if (phone) {
                  api
                    .post("/whatsapp/send-invoice", {
                      invoiceId: info.row.original.id,
                      phoneNumber: phone,
                    })
                    .then(() => alert("Invoice queued for WhatsApp delivery!"))
                    .catch((err: Error) => alert(err.message || "Failed to send"));
                }
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <ActionMenu
              items={[
                {
                  label: "View",
                  icon: <Eye className="h-4 w-4" />,
                  onClick: () => router.push(`/invoices/${info.row.original.id}`),
                },
                {
                  label: "Edit",
                  icon: <Pencil className="h-4 w-4" />,
                  onClick: () =>
                    router.push(`/invoices/${info.row.original.id}/edit`),
                },
                {
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  danger: true,
                  onClick: () =>
                    handleDelete(
                      info.row.original.id,
                      info.row.original.invoice_number,
                    ),
                },
              ]}
            />
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data: invoices,
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
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track your invoices
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
          <Link href="/invoices/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Invoice</Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by customer or invoice number..."
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
            Failed to load invoices. Please try again.
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/invoices/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
