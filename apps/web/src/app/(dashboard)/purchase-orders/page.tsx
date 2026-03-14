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
import { usePurchaseOrders, type PurchaseOrder } from "@/hooks/use-purchase-orders";
import { Plus, Search, Download, ShoppingCart } from "lucide-react";

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  acknowledged: { variant: "warning", label: "Acknowledged" },
  received: { variant: "success", label: "Received" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const columnHelper = createColumnHelper<PurchaseOrder>();

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading } = usePurchaseOrders({
    status: activeTab !== "all" ? activeTab : undefined,
    search: searchQuery || undefined,
  });

  const orders = data?.data || [];

  const tabs = [
    { value: "all", label: "All", count: orders.length },
    { value: "draft", label: "Draft", count: orders.filter((o) => o.status === "draft").length },
    { value: "sent", label: "Sent", count: orders.filter((o) => o.status === "sent").length },
    { value: "acknowledged", label: "Acknowledged", count: orders.filter((o) => o.status === "acknowledged").length },
    { value: "received", label: "Received", count: orders.filter((o) => o.status === "received").length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("po_number", {
        header: "PO #",
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
      columnHelper.accessor("delivery_date", {
        header: "Delivery Date",
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
    data: orders,
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
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage purchase orders to vendors
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
          <Link href="/purchase-orders/new">
            <Button icon={<Plus className="h-4 w-4" />}>
              New Purchase Order
            </Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by vendor or PO number..."
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
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No purchase orders found</p>
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
