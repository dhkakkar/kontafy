"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface ContactAging {
  contact_id: string;
  contact_name: string;
  type: string;
  total: number;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
}

interface OutstandingResponse {
  data: {
    summary: {
      total_receivable: number;
      total_payable: number;
      total_overdue: number;
      net_outstanding: number;
    };
    aging: {
      receivable: { current: number; days_1_30: number; days_31_60: number; days_61_90: number; days_90_plus: number };
      payable: { current: number; days_1_30: number; days_31_60: number; days_61_90: number; days_90_plus: number };
    };
    contact_aging: ContactAging[];
  };
}

const columnHelper = createColumnHelper<ContactAging>();

export default function OutstandingPage() {
  const [activeTab, setActiveTab] = useState("receivable");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["outstanding-payments"],
    queryFn: async () => {
      const res = await api.get<OutstandingResponse>("/bill/payments/outstanding");
      return res.data;
    },
  });

  const summary = data?.summary || { total_receivable: 0, total_payable: 0, total_overdue: 0 };
  const contactAging = data?.contact_aging || [];

  const receivableData = contactAging.filter(
    (c) => c.type === "customer" || c.type === "both"
  );
  const payableData = contactAging.filter(
    (c) => c.type === "vendor" || c.type === "both"
  );

  const tabs = [
    {
      value: "receivable",
      label: "Receivables",
      count: receivableData.length,
    },
    { value: "payable", label: "Payables", count: payableData.length },
  ];

  const currentData = activeTab === "receivable" ? receivableData : payableData;

  const filteredData = useMemo(() => {
    if (!searchQuery) return currentData;
    return currentData.filter((c) =>
      c.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentData, searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("contact_name", {
        header: "Contact",
        cell: (info) => (
          <Link
            href={`/contacts`}
            className="font-medium text-primary-800 hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("total", {
        header: "Total Outstanding",
        cell: (info) => (
          <span className="font-bold text-gray-900">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("current", {
        header: "Current",
        cell: (info) => (
          <span className={info.getValue() > 0 ? "text-success-700 font-medium" : "text-gray-400"}>
            {info.getValue() > 0 ? formatCurrency(info.getValue()) : "-"}
          </span>
        ),
      }),
      columnHelper.accessor("days_1_30", {
        header: "1-30 Days",
        cell: (info) => (
          <span className={info.getValue() > 0 ? "text-warning-600 font-medium" : "text-gray-400"}>
            {info.getValue() > 0 ? formatCurrency(info.getValue()) : "-"}
          </span>
        ),
      }),
      columnHelper.accessor("days_31_60", {
        header: "31-60 Days",
        cell: (info) => (
          <span className={info.getValue() > 0 ? "text-warning-700 font-medium" : "text-gray-400"}>
            {info.getValue() > 0 ? formatCurrency(info.getValue()) : "-"}
          </span>
        ),
      }),
      columnHelper.accessor("days_61_90", {
        header: "61-90 Days",
        cell: (info) => (
          <span className={info.getValue() > 0 ? "text-danger-600 font-medium" : "text-gray-400"}>
            {info.getValue() > 0 ? formatCurrency(info.getValue()) : "-"}
          </span>
        ),
      }),
      columnHelper.accessor("days_90_plus", {
        header: "90+ Days",
        cell: (info) => (
          <span className={info.getValue() > 0 ? "text-danger-700 font-bold" : "text-gray-400"}>
            {info.getValue() > 0 ? formatCurrency(info.getValue()) : "-"}
          </span>
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
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/payments"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Outstanding & Aging
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Receivables and payables aging analysis
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="h-4 w-4" />}
        >
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-success-50 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-success-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Receivable</p>
            <p className="text-xl font-bold text-success-700">
              {formatCurrency(summary.total_receivable)}
            </p>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-warning-50 flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-warning-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Payable</p>
            <p className="text-xl font-bold text-warning-700">
              {formatCurrency(summary.total_payable)}
            </p>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-danger-50 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-danger-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Overdue</p>
            <p className="text-xl font-bold text-danger-700">
              {formatCurrency(summary.total_overdue)}
            </p>
          </div>
        </Card>
      </div>

      {/* Aging Table */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search contacts..."
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
        ) : (
          <DataTable table={table} />
        )}

        {!isLoading && filteredData.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">No outstanding amounts found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
