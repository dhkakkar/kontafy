"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
import { Plus, Search, Download, MoreHorizontal } from "lucide-react";

interface Purchase {
  id: string;
  number: string;
  vendor: string;
  date: string;
  dueDate: string;
  amount: number;
  status: "draft" | "sent" | "overdue" | "paid" | "partially_paid" | "cancelled";
}

const purchases: Purchase[] = [
  {
    id: "1",
    number: "BILL/25-26/0012",
    vendor: "Skyline Properties",
    date: "2026-03-10",
    dueDate: "2026-04-10",
    amount: 45000,
    status: "sent",
  },
  {
    id: "2",
    number: "BILL/25-26/0011",
    vendor: "Office Supplies Co.",
    date: "2026-03-08",
    dueDate: "2026-04-08",
    amount: 12500,
    status: "paid",
  },
  {
    id: "3",
    number: "BILL/25-26/0010",
    vendor: "Prism Digital",
    date: "2026-03-05",
    dueDate: "2026-04-05",
    amount: 22000,
    status: "paid",
  },
  {
    id: "4",
    number: "BILL/25-26/0009",
    vendor: "CloudHost India",
    date: "2026-03-01",
    dueDate: "2026-03-31",
    amount: 8500,
    status: "sent",
  },
  {
    id: "5",
    number: "BILL/25-26/0008",
    vendor: "RawMat Suppliers",
    date: "2026-02-25",
    dueDate: "2026-03-25",
    amount: 185000,
    status: "partially_paid",
  },
  {
    id: "6",
    number: "BILL/25-26/0007",
    vendor: "Logistics Express",
    date: "2026-02-20",
    dueDate: "2026-03-05",
    amount: 35000,
    status: "overdue",
  },
  {
    id: "7",
    number: "BILL/25-26/0006",
    vendor: "Power Utilities Ltd.",
    date: "2026-02-15",
    dueDate: "2026-03-15",
    amount: 28000,
    status: "draft",
  },
];

const statusBadgeMap: Record<
  Purchase["status"],
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

  const tabs = [
    { value: "all", label: "All", count: purchases.length },
    {
      value: "draft",
      label: "Draft",
      count: purchases.filter((p) => p.status === "draft").length,
    },
    {
      value: "sent",
      label: "Pending",
      count: purchases.filter((p) => p.status === "sent" || p.status === "partially_paid").length,
    },
    {
      value: "overdue",
      label: "Overdue",
      count: purchases.filter((p) => p.status === "overdue").length,
    },
    {
      value: "paid",
      label: "Paid",
      count: purchases.filter((p) => p.status === "paid").length,
    },
  ];

  const filteredData = useMemo(() => {
    return purchases.filter((p) => {
      if (activeTab !== "all") {
        if (activeTab === "sent" && p.status !== "sent" && p.status !== "partially_paid") return false;
        else if (activeTab !== "sent" && p.status !== activeTab) return false;
      }
      if (
        searchQuery &&
        !p.vendor.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.number.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeTab, searchQuery]);

  const totalOutstanding = purchases
    .filter((p) => ["sent", "overdue", "partially_paid"].includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0);

  const columns = useMemo(
    () => [
      columnHelper.accessor("number", {
        header: "Bill #",
        cell: (info) => (
          <span className="font-medium text-primary-800">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("vendor", {
        header: "Vendor",
        cell: (info) => (
          <span className="text-gray-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
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
          const s = statusBadgeMap[info.getValue()];
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
                .reduce((s, p) => s + p.amount, 0)
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

        <DataTable table={table} />
      </Card>
    </div>
  );
}
