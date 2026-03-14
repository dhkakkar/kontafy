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
import { Search, Plus, ArrowLeft, Truck } from "lucide-react";
import { useEwayBillList, type EwayBillListItem } from "@/hooks/use-einvoice";

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  pending: { variant: "warning", label: "Pending" },
  expired: { variant: "danger", label: "Expired" },
  cancelled: { variant: "default", label: "Cancelled" },
};

const columnHelper = createColumnHelper<EwayBillListItem>();

export default function EwayBillListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: listData, isLoading } = useEwayBillList({
    page,
    limit: 20,
    status: activeTab !== "all" ? activeTab : undefined,
    search: searchQuery || undefined,
  });

  const tabs = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
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
      columnHelper.accessor("eway_bill_no", {
        header: "E-Way Bill No.",
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="font-mono text-sm text-gray-900">{val}</span>
          ) : (
            <span className="text-gray-400">--</span>
          );
        },
      }),
      columnHelper.accessor("eway_status", {
        header: "Status",
        cell: (info) => {
          const s = statusBadgeMap[info.getValue()] || statusBadgeMap.pending;
          return (
            <Badge variant={s.variant} dot>
              {s.label}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("requires_eway_bill", {
        header: "Required",
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="warning">Required</Badge>
          ) : (
            <span className="text-gray-400 text-xs">Optional</span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => {
          const row = info.row.original;
          if (!row.eway_bill_no && row.requires_eway_bill) {
            return (
              <Link href={`/einvoice/eway-bills/generate?invoiceId=${row.id}`}>
                <Button variant="outline" size="sm">
                  Generate
                </Button>
              </Link>
            );
          }
          return null;
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/einvoice")}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">E-Way Bills</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage e-way bills for goods transport (auto-required for invoices above Rs.50,000)
            </p>
          </div>
        </div>
        <Link href="/einvoice/eway-bills/generate">
          <Button icon={<Plus className="h-4 w-4" />}>Generate E-Way Bill</Button>
        </Link>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by invoice number, e-way bill number, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : tableData.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900">No e-way bills found</h3>
            <p className="text-sm text-gray-500 mt-1">
              E-Way bills will appear here once generated.
            </p>
          </div>
        ) : (
          <DataTable table={table} />
        )}

        {listData?.meta && listData.meta.total_pages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {listData.meta.page} of {listData.meta.total_pages}
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
