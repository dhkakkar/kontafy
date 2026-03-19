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
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, Search, Download, Loader2, Truck } from "lucide-react";

interface DeliveryChallan {
  id: string;
  challan_number: string;
  contact_name?: string;
  contact?: { name: string };
  date: string;
  status: "draft" | "sent" | "delivered" | "invoiced" | "cancelled";
  total_items: number;
  delivery_address?: string;
}

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  delivered: { variant: "success", label: "Delivered" },
  invoiced: { variant: "success", label: "Invoiced" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const columnHelper = createColumnHelper<DeliveryChallan>();

export default function DeliveryChallansPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const params: Record<string, string> = {};
  if (activeTab !== "all") params.status = activeTab;
  if (searchQuery) params.search = searchQuery;

  const { data: res, isLoading } = useQuery({
    queryKey: ["delivery-challans", activeTab, searchQuery],
    queryFn: () =>
      api.get<{ data: DeliveryChallan[] }>("/bill/delivery-challans", params),
  });

  const challans = res?.data || [];

  const tabs = [
    { value: "all", label: "All", count: challans.length },
    { value: "draft", label: "Draft", count: challans.filter((c) => c.status === "draft").length },
    { value: "sent", label: "Sent", count: challans.filter((c) => c.status === "sent").length },
    { value: "delivered", label: "Delivered", count: challans.filter((c) => c.status === "delivered").length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("challan_number", {
        header: "Challan #",
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
      columnHelper.accessor("total_items", {
        header: "Items",
        cell: (info) => (
          <span className="text-gray-900">{info.getValue()}</span>
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
    data: challans,
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
            Delivery Challans
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track goods sent to customers without invoicing
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
          <Link href="/delivery-challans/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Challan</Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200 flex items-end gap-4 flex-wrap">
          <Input
            placeholder="Search by customer or challan number..."
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
        ) : challans.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No delivery challans found</p>
          </div>
        ) : (
          <DataTable
            table={table}
            onRowClick={(row) => router.push(`/delivery-challans/${row.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
