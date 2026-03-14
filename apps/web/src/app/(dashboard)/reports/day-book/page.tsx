"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Download } from "lucide-react";
import { useDayBook, useExportReport } from "@/hooks/use-reports";

export default function DayBookPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useDayBook({ fromDate, toDate, page, limit: 50 });
  const exportMutation = useExportReport();

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportMutation.mutateAsync({
      reportType: "day-book",
      format,
      filters: { fromDate, toDate },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `day-book-${today}.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/reports")}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Day Book</h1>
            <p className="text-sm text-gray-500 mt-1">
              Chronological journal register
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={() => handleExport("excel")}
          >
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            PDF
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </Card>
      ) : data?.entries && data.entries.length > 0 ? (
        <>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">
                      Entry #
                    </th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">
                      Narration
                    </th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">
                      Account
                    </th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">
                      Debit
                    </th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) =>
                    entry.lines.map((line, lineIdx) => (
                      <tr
                        key={`${entry.id}-${lineIdx}`}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        {lineIdx === 0 ? (
                          <>
                            <td
                              className="px-4 py-2 text-gray-600"
                              rowSpan={entry.lines.length}
                            >
                              {formatDate(entry.date)}
                            </td>
                            <td
                              className="px-4 py-2 text-gray-600"
                              rowSpan={entry.lines.length}
                            >
                              {entry.entry_number}
                            </td>
                            <td
                              className="px-4 py-2 text-gray-900"
                              rowSpan={entry.lines.length}
                            >
                              {entry.narration || "--"}
                            </td>
                          </>
                        ) : null}
                        <td className="px-4 py-2 text-gray-900">
                          <span className="text-xs text-gray-400 mr-1">
                            {line.account_code}
                          </span>
                          {line.account_name}
                        </td>
                        <td className="text-right px-4 py-2 text-gray-900">
                          {line.debit > 0 ? formatCurrency(line.debit) : ""}
                        </td>
                        <td className="text-right px-4 py-2 text-gray-900">
                          {line.credit > 0 ? formatCurrency(line.credit) : ""}
                        </td>
                      </tr>
                    )),
                  )}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan={4} className="px-4 py-3 text-gray-900">
                      Total ({data.totals.entries_count} entries)
                    </td>
                    <td className="text-right px-4 py-3 text-gray-900">
                      {formatCurrency(data.totals.debit)}
                    </td>
                    <td className="text-right px-4 py-3 text-gray-900">
                      {formatCurrency(data.totals.credit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Page {data.pagination.page} of {data.pagination.total_pages}
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
                  disabled={page >= data.pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">No entries found for the selected period.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
