"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, Filter, Calendar, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface JournalLine {
  debit: number | string | null;
  credit: number | string | null;
}

interface JournalEntry {
  id: string;
  entry_number: number;
  date: string;
  narration: string | null;
  is_posted: boolean;
  lines?: JournalLine[];
}

interface ApiResponse {
  success: boolean;
  data: JournalEntry[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export default function JournalEntriesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDateRange, setShowDateRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const dateRangeRef = useRef<HTMLDivElement>(null);

  // Close date range popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(e.target as Node)) {
        setShowDateRange(false);
      }
    };
    if (showDateRange) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDateRange]);

  const { data: apiResponse, isLoading } = useQuery<ApiResponse>({
    queryKey: ["journal-entries", activeTab, fromDate, toDate],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "50" };
      if (activeTab === "posted") params.posted = "true";
      if (activeTab === "draft") params.posted = "false";
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      return api.get<ApiResponse>("/books/journal-entries", params);
    },
  });

  const entries = apiResponse?.data || [];
  const totalCount = apiResponse?.meta?.total || entries.length;
  const postedCount = entries.filter((e) => e.is_posted).length;
  const draftCount = entries.filter((e) => !e.is_posted).length;

  const tabs = [
    { value: "all", label: "All Entries", count: totalCount },
    { value: "posted", label: "Posted", count: postedCount },
    { value: "draft", label: "Draft", count: draftCount },
  ];

  const filteredEntries = entries.filter((entry) => {
    if (
      searchQuery &&
      !entry.narration?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !String(entry.entry_number).includes(searchQuery)
    )
      return false;
    return true;
  });

  const hasDateFilter = fromDate || toDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage journal entries
          </p>
        </div>
        <Link href="/books/journal/new">
          <Button icon={<Plus className="h-4 w-4" />}>New Entry</Button>
        </Link>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-3 flex-wrap">
          {(showFilters || searchQuery) && (
            <Input
              placeholder="Search by narration or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="max-w-sm"
            />
          )}
          <div className="relative" ref={dateRangeRef}>
            <Button
              variant={hasDateFilter ? "primary" : "outline"}
              size="sm"
              icon={<Calendar className="h-4 w-4" />}
              onClick={() => setShowDateRange(!showDateRange)}
            >
              {hasDateFilter
                ? `${fromDate || "Start"} - ${toDate || "End"}`
                : "Date Range"}
            </Button>
            {hasDateFilter && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFromDate("");
                  setToDate("");
                }}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gray-500 text-white flex items-center justify-center hover:bg-gray-700"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
            {showDateRange && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20 min-w-[280px]">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowDateRange(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button
            variant={showFilters ? "primary" : "outline"}
            size="sm"
            icon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-500 mt-2 text-sm">Loading entries...</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry #
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Narration
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lines
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-primary-800">
                        JE-{entry.entry_number}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {formatDate(entry.date)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 max-w-md truncate">
                      {entry.narration || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center text-gray-500">
                      {entry.lines?.length || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(
                        entry.lines?.reduce((sum, l) => sum + (Number(l.debit) || 0), 0) || 0
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={entry.is_posted ? "success" : "warning"}
                        dot
                      >
                        {entry.is_posted ? "Posted" : "Draft"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredEntries.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">No journal entries found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
