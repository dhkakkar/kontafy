"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Download } from "lucide-react";
import { useTdsSummary, useExportReport } from "@/hooks/use-reports";

export default function TdsSummaryPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [section, setSection] = useState("");

  const { data, isLoading } = useTdsSummary({
    fromDate,
    toDate,
    section: section || undefined,
  });
  const exportMutation = useExportReport();

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportMutation.mutateAsync({
      reportType: "tds-summary",
      format,
      filters: { fromDate, toDate, ...(section && { section }) },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tds-summary-${today}.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/reports")}>Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TDS Summary</h1>
            <p className="text-sm text-gray-500 mt-1">TDS deducted by section and deductee</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => handleExport("excel")}>Excel</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>PDF</Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <Input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g., 194C"
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><div className="h-32 bg-gray-100 animate-pulse rounded" /></Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <p className="text-xs text-gray-500">Total Entries</p>
              <p className="text-xl font-bold">{data.totals.entry_count}</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500">Gross Amount</p>
              <p className="text-xl font-bold">{formatCurrency(data.totals.total_gross_amount)}</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500">Total TDS</p>
              <p className="text-xl font-bold">{formatCurrency(data.totals.total_tds_amount)}</p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500">Pending Deposit</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(data.totals.pending_amount)}</p>
              <p className="text-xs text-gray-400">{data.totals.pending_count} entries</p>
            </Card>
          </div>

          {/* Section Summary */}
          {data.section_summary.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Section-wise Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Section</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Entries</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Gross Amount</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">TDS Amount</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Pending</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Deposited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.section_summary.map((s) => (
                      <tr key={s.section} className="border-b border-gray-50">
                        <td className="px-3 py-2 font-medium">{s.section}</td>
                        <td className="text-right px-3 py-2">{s.entry_count}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(s.total_gross_amount)}</td>
                        <td className="text-right px-3 py-2 font-semibold">{formatCurrency(s.total_tds_amount)}</td>
                        <td className="text-right px-3 py-2 text-amber-600">{s.entries_pending}</td>
                        <td className="text-right px-3 py-2 text-green-600">{s.entries_deposited}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Entries Table */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">All TDS Entries</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Section</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Deductee</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">PAN</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Gross Amt</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Rate %</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">TDS Amt</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">{formatDate(entry.date)}</td>
                      <td className="px-4 py-2 font-medium">{entry.section}</td>
                      <td className="px-4 py-2">{entry.contact?.name || "N/A"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{entry.contact?.pan || "--"}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(entry.gross_amount)}</td>
                      <td className="text-right px-4 py-2">{entry.tds_rate}%</td>
                      <td className="text-right px-4 py-2 font-semibold">{formatCurrency(entry.tds_amount)}</td>
                      <td className="text-center px-4 py-2">
                        <Badge variant={entry.status === "deposited" ? "success" : "warning"} dot>
                          {entry.status === "deposited" ? "Deposited" : "Pending"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan={4} className="px-4 py-3">Total</td>
                    <td className="text-right px-4 py-3">{formatCurrency(data.totals.total_gross_amount)}</td>
                    <td />
                    <td className="text-right px-4 py-3">{formatCurrency(data.totals.total_tds_amount)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
