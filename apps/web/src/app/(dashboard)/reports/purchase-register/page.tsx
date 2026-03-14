"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Download } from "lucide-react";
import { usePurchaseRegister, useExportReport } from "@/hooks/use-reports";

export default function PurchaseRegisterPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [groupBy, setGroupBy] = useState("vendor");

  const { data, isLoading } = usePurchaseRegister({ fromDate, toDate, groupBy });
  const exportMutation = useExportReport();

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportMutation.mutateAsync({
      reportType: "purchase-register",
      format,
      filters: { fromDate, toDate, groupBy },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-register-${today}.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/reports")}>Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Register</h1>
            <p className="text-sm text-gray-500 mt-1">Purchase bills by vendor, product, or month</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="vendor">Vendor</option>
              <option value="product">Product</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card><div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div></Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><p className="text-xs text-gray-500">Bills</p><p className="text-xl font-bold">{data.totals.invoice_count}</p></Card>
            <Card><p className="text-xs text-gray-500">Subtotal</p><p className="text-xl font-bold">{formatCurrency(data.totals.subtotal)}</p></Card>
            <Card><p className="text-xs text-gray-500">Tax</p><p className="text-xl font-bold">{formatCurrency(data.totals.tax_amount)}</p></Card>
            <Card><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold">{formatCurrency(data.totals.total)}</p></Card>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Bill #</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Vendor</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Subtotal</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Tax</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">{formatDate(entry.date)}</td>
                      <td className="px-4 py-2 font-medium text-primary-800">{entry.invoice_number}</td>
                      <td className="px-4 py-2">{entry.contact?.name || "Unknown"}</td>
                      <td className="px-4 py-2"><Badge variant="default">{entry.status}</Badge></td>
                      <td className="text-right px-4 py-2">{formatCurrency(entry.subtotal)}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(entry.tax_amount)}</td>
                      <td className="text-right px-4 py-2 font-semibold">{formatCurrency(entry.total)}</td>
                      <td className="text-right px-4 py-2 text-amber-600">{entry.balance_due > 0 ? formatCurrency(entry.balance_due) : "--"}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan={4} className="px-4 py-3">Total ({data.totals.invoice_count} bills)</td>
                    <td className="text-right px-4 py-3">{formatCurrency(data.totals.subtotal)}</td>
                    <td className="text-right px-4 py-3">{formatCurrency(data.totals.tax_amount)}</td>
                    <td className="text-right px-4 py-3">{formatCurrency(data.totals.total)}</td>
                    <td className="text-right px-4 py-3 text-amber-600">{formatCurrency(data.totals.balance_due)}</td>
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
