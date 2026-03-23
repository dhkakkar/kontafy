"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, Filter, Calendar, Loader2 } from "lucide-react";
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
  lines: JournalLine[];
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

  const { data: apiResponse, isLoading } = useQuery<ApiResponse>({
    queryKey: ["journal-entries", activeTab],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "50" };
      if (activeTab === "posted") params.posted = "true";
      if (activeTab === "draft") params.posted = "false";
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
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <Input
            placeholder="Search by narration or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
          <Button variant="outline" size="sm" icon={<Calendar className="h-4 w-4" />}>
            Date Range
          </Button>
          <Button variant="outline" size="sm" icon={<Filter className="h-4 w-4" />}>
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
