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
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface ContactAging {
  id: string;
  name: string;
  type: "customer" | "vendor" | "both";
  total: number;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
}

const contactAgingData: ContactAging[] = [
  {
    id: "1",
    name: "NovaTech Infra",
    type: "customer",
    total: 142000,
    current: 0,
    days_1_30: 0,
    days_31_60: 142000,
    days_61_90: 0,
    days_90_plus: 0,
  },
  {
    id: "2",
    name: "TechStar Solutions",
    type: "customer",
    total: 125000,
    current: 125000,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
  },
  {
    id: "3",
    name: "GreenLeaf Exports",
    type: "customer",
    total: 87500,
    current: 87500,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
  },
  {
    id: "4",
    name: "Apex Manufacturing",
    type: "customer",
    total: 75000,
    current: 0,
    days_1_30: 75000,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
  },
  {
    id: "5",
    name: "Prism Digital",
    type: "customer",
    total: 56000,
    current: 56000,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
  },
  {
    id: "6",
    name: "Skyline Properties",
    type: "vendor",
    total: 45000,
    current: 45000,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
  },
  {
    id: "7",
    name: "Prism Digital",
    type: "vendor",
    total: 22000,
    current: 22000,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
  },
];

const summaryData = {
  total_receivable: 485500,
  total_payable: 67000,
  total_overdue: 217000,
};

const columnHelper = createColumnHelper<ContactAging>();

export default function OutstandingPage() {
  const [activeTab, setActiveTab] = useState("receivable");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const receivableData = contactAgingData.filter(
    (c) => c.type === "customer" || c.type === "both"
  );
  const payableData = contactAgingData.filter(
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
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentData, searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
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
              {formatCurrency(summaryData.total_receivable)}
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
              {formatCurrency(summaryData.total_payable)}
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
              {formatCurrency(summaryData.total_overdue)}
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

        <DataTable table={table} />

        {filteredData.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">No outstanding amounts found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
