"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Search, IndianRupee, FileStack, AlertTriangle } from "lucide-react";
import dayjs from "dayjs";

interface TdsEntry {
  id: string;
  section: string;
  transaction_date: string;
  gross_amount: number;
  tds_rate: number;
  tds_amount: number;
  status: string;
  contact: {
    id: string;
    name: string;
    company_name: string | null;
    pan: string | null;
  } | null;
  created_at: string;
}

interface TdsSectionSummary {
  section: string;
  total_gross_amount: number;
  total_tds_amount: number;
  entry_count: number;
  entries_pending: number;
  entries_deposited: number;
}

const statusBadgeMap: Record<
  string,
  { variant: "default" | "warning" | "success"; label: string }
> = {
  pending: { variant: "warning", label: "Pending" },
  deposited: { variant: "success", label: "Deposited" },
  filed: { variant: "success", label: "Filed" },
};

const columnHelper = createColumnHelper<TdsEntry>();

export default function TdsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Current FY dates
  const now = dayjs();
  const fyStart = now.month() >= 3
    ? now.startOf("year").month(3).format("YYYY-MM-DD")
    : now.subtract(1, "year").startOf("year").month(3).format("YYYY-MM-DD");
  const fyEnd = now.month() >= 3
    ? now.add(1, "year").startOf("year").month(2).endOf("month").format("YYYY-MM-DD")
    : now.startOf("year").month(2).endOf("month").format("YYYY-MM-DD");

  // Fetch TDS entries
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ["tds-entries"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: TdsEntry[]; meta: any }>("/tax/tds", {
        limit: "100",
      });
      return res.data;
    },
  });

  // Fetch TDS summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["tds-summary", fyStart, fyEnd],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: TdsSectionSummary[] }>("/tax/tds/summary", {
        from: fyStart,
        to: fyEnd,
      });
      return res.data;
    },
  });

  const entries = Array.isArray(entriesData) ? entriesData : [];
  const summary = Array.isArray(summaryData) ? summaryData : [];

  const totalTdsDeducted = summary.reduce((acc, s) => acc + s.total_tds_amount, 0);
  const totalPending = summary.reduce((acc, s) => acc + s.entries_pending, 0);

  const filteredData = useMemo(() => {
    if (!searchQuery) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.section.toLowerCase().includes(q) ||
        e.contact?.name.toLowerCase().includes(q) ||
        e.contact?.company_name?.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("section", {
        header: "Section",
        cell: (info) => (
          <Badge variant="outline">{info.getValue()}</Badge>
        ),
      }),
      columnHelper.accessor("contact", {
        header: "Deductee",
        cell: (info) => {
          const contact = info.getValue();
          return (
            <div>
              <span className="text-gray-900">
                {contact?.name || "N/A"}
              </span>
              {contact?.pan && (
                <span className="block text-xs text-gray-500 font-mono">
                  PAN: {contact.pan}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("transaction_date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("gross_amount", {
        header: "Gross Amount",
        cell: (info) => (
          <span className="text-gray-700">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("tds_rate", {
        header: "Rate",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue()}%</span>
        ),
      }),
      columnHelper.accessor("tds_amount", {
        header: "TDS Amount",
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const badge = statusBadgeMap[info.getValue()] || statusBadgeMap.pending;
          return (
            <Badge variant={badge.variant} dot>
              {badge.label}
            </Badge>
          );
        },
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/tax">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TDS Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track TDS deductions and deposits
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total TDS Deducted</p>
              <p className="text-sm text-gray-400 mt-0.5">Current FY</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-primary-800" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {summaryLoading ? "..." : formatCurrency(totalTdsDeducted)}
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Entries</p>
              <p className="text-sm text-gray-400 mt-0.5">All sections</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-info-50 flex items-center justify-center">
              <FileStack className="h-5 w-5 text-primary-800" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {entriesLoading ? "..." : entries.length}
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Deposits</p>
              <p className="text-sm text-gray-400 mt-0.5">To be deposited</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-warning-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {summaryLoading ? "..." : totalPending}
          </p>
        </Card>
      </div>

      {/* Section-wise Summary */}
      {summary.length > 0 && (
        <Card padding="none">
          <div className="p-6 border-b border-gray-200">
            <CardHeader className="mb-0">
              <CardTitle>Section-wise Summary (Current FY)</CardTitle>
            </CardHeader>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">Section</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Entries</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Gross Amount</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">TDS Amount</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Pending</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Deposited</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.section} className="border-b border-gray-100">
                    <td className="h-12 px-4">
                      <Badge variant="outline">{s.section}</Badge>
                    </td>
                    <td className="h-12 px-4 text-right text-gray-700">{s.entry_count}</td>
                    <td className="h-12 px-4 text-right text-gray-700">
                      {formatCurrency(s.total_gross_amount)}
                    </td>
                    <td className="h-12 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(s.total_tds_amount)}
                    </td>
                    <td className="h-12 px-4 text-right">
                      {s.entries_pending > 0 ? (
                        <Badge variant="warning">{s.entries_pending}</Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="h-12 px-4 text-right">
                      {s.entries_deposited > 0 ? (
                        <Badge variant="success">{s.entries_deposited}</Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TDS Entries Table */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">TDS Entries</h3>
          </div>
        </div>
        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by section, deductee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {entriesLoading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading TDS entries...
          </div>
        ) : (
          <DataTable table={table} />
        )}
      </Card>
    </div>
  );
}
