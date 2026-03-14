"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, Filter, Calendar } from "lucide-react";

interface JournalEntry {
  id: string;
  number: string;
  date: string;
  narration: string;
  debitTotal: number;
  creditTotal: number;
  status: "posted" | "draft";
  lines: number;
}

const journalEntries: JournalEntry[] = [
  {
    id: "1",
    number: "JE-0024",
    date: "2026-03-12",
    narration: "Monthly rent payment for March 2026",
    debitTotal: 45000,
    creditTotal: 45000,
    status: "posted",
    lines: 2,
  },
  {
    id: "2",
    number: "JE-0023",
    date: "2026-03-10",
    narration: "Office supplies purchase from Staples India",
    debitTotal: 8500,
    creditTotal: 8500,
    status: "posted",
    lines: 3,
  },
  {
    id: "3",
    number: "JE-0022",
    date: "2026-03-08",
    narration: "Revenue recognition for consulting services",
    debitTotal: 125000,
    creditTotal: 125000,
    status: "draft",
    lines: 4,
  },
  {
    id: "4",
    number: "JE-0021",
    date: "2026-03-05",
    narration: "Salary disbursement for February 2026",
    debitTotal: 474000,
    creditTotal: 474000,
    status: "posted",
    lines: 6,
  },
  {
    id: "5",
    number: "JE-0020",
    date: "2026-03-03",
    narration: "Depreciation entry for fixed assets - Q4",
    debitTotal: 37500,
    creditTotal: 37500,
    status: "posted",
    lines: 4,
  },
  {
    id: "6",
    number: "JE-0019",
    date: "2026-03-01",
    narration: "Opening balances adjustment for FY 2026-27",
    debitTotal: 1250000,
    creditTotal: 1250000,
    status: "draft",
    lines: 12,
  },
];

const tabs = [
  { value: "all", label: "All Entries", count: 24 },
  { value: "posted", label: "Posted", count: 20 },
  { value: "draft", label: "Draft", count: 4 },
];

export default function JournalEntriesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEntries = journalEntries.filter((entry) => {
    if (activeTab !== "all" && entry.status !== activeTab) return false;
    if (
      searchQuery &&
      !entry.narration.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !entry.number.toLowerCase().includes(searchQuery.toLowerCase())
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

        {/* Table */}
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
                      {entry.number}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    {formatDate(entry.date)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 max-w-md truncate">
                    {entry.narration}
                  </td>
                  <td className="py-3.5 px-4 text-center text-gray-500">
                    {entry.lines}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-gray-900">
                    {formatCurrency(entry.debitTotal)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge
                      variant={
                        entry.status === "posted" ? "success" : "warning"
                      }
                      dot
                    >
                      {entry.status === "posted" ? "Posted" : "Draft"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEntries.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">No journal entries found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
