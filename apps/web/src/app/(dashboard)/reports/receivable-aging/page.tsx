"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useReceivableAging, useExportReport } from "@/hooks/use-reports";

export default function ReceivableAgingPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [asOfDate, setAsOfDate] = useState(today);

  const { data, isLoading } = useReceivableAging({ asOfDate });
  const exportMutation = useExportReport();

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportMutation.mutateAsync({
      reportType: "receivable-aging",
      format,
      filters: { asOfDate },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receivable-aging-${today}.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = data?.buckets?.slice(0, 10).map((b) => ({
    name: b.contact_name.length > 15 ? b.contact_name.substring(0, 15) + "..." : b.contact_name,
    Current: b.current,
    "1-30": b.days_1_30,
    "31-60": b.days_31_60,
    "61-90": b.days_61_90,
    "90+": b.days_90_plus,
  })) || [];

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
            <h1 className="text-2xl font-bold text-gray-900">
              Receivable Aging
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Accounts receivable aging analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => handleExport("excel")}>
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>PDF</Button>
        </div>
      </div>

      <Card>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              As of Date
            </label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Card><div className="h-64 bg-gray-100 animate-pulse rounded" /></Card>
          <Card><div className="h-48 bg-gray-100 animate-pulse rounded" /></Card>
        </div>
      ) : data ? (
        <>
          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Aging Distribution (Top 10 Customers)
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Bar dataKey="Current" stackId="a" fill="#22c55e" />
                  <Bar dataKey="1-30" stackId="a" fill="#eab308" />
                  <Bar dataKey="31-60" stackId="a" fill="#f97316" />
                  <Bar dataKey="61-90" stackId="a" fill="#ef4444" />
                  <Bar dataKey="90+" stackId="a" fill="#991b1b" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Table */}
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Customer</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Current</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">1-30 Days</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">31-60 Days</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">61-90 Days</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">90+ Days</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.buckets.map((b) => (
                    <tr key={b.contact_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{b.contact_name}</div>
                        {b.company_name && (
                          <div className="text-xs text-gray-500">{b.company_name}</div>
                        )}
                      </td>
                      <td className="text-right px-4 py-2 text-gray-900">{b.current > 0 ? formatCurrency(b.current) : "--"}</td>
                      <td className="text-right px-4 py-2 text-gray-900">{b.days_1_30 > 0 ? formatCurrency(b.days_1_30) : "--"}</td>
                      <td className="text-right px-4 py-2 text-gray-900">{b.days_31_60 > 0 ? formatCurrency(b.days_31_60) : "--"}</td>
                      <td className="text-right px-4 py-2 text-gray-900">{b.days_61_90 > 0 ? formatCurrency(b.days_61_90) : "--"}</td>
                      <td className="text-right px-4 py-2 text-red-600 font-medium">{b.days_90_plus > 0 ? formatCurrency(b.days_90_plus) : "--"}</td>
                      <td className="text-right px-4 py-2 font-semibold text-gray-900">{formatCurrency(b.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td className="px-4 py-3 text-gray-900">Total</td>
                    <td className="text-right px-4 py-3 text-gray-900">{formatCurrency(data.totals.current)}</td>
                    <td className="text-right px-4 py-3 text-gray-900">{formatCurrency(data.totals.days_1_30)}</td>
                    <td className="text-right px-4 py-3 text-gray-900">{formatCurrency(data.totals.days_31_60)}</td>
                    <td className="text-right px-4 py-3 text-gray-900">{formatCurrency(data.totals.days_61_90)}</td>
                    <td className="text-right px-4 py-3 text-red-600">{formatCurrency(data.totals.days_90_plus)}</td>
                    <td className="text-right px-4 py-3 text-gray-900">{formatCurrency(data.totals.total)}</td>
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
