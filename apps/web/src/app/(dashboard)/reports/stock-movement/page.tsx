"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Download } from "lucide-react";
import { useStockMovement, useExportReport } from "@/hooks/use-reports";

const typeColors: Record<string, { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }> = {
  purchase_in: { variant: "success", label: "Purchase In" },
  sale_out: { variant: "danger", label: "Sale Out" },
  adjustment: { variant: "info", label: "Adjustment" },
  transfer: { variant: "warning", label: "Transfer" },
  return_in: { variant: "success", label: "Return In" },
  return_out: { variant: "danger", label: "Return Out" },
};

export default function StockMovementPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);

  const { data, isLoading } = useStockMovement({ fromDate, toDate });
  const exportMutation = useExportReport();

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportMutation.mutateAsync({
      reportType: "stock-movement",
      format,
      filters: { fromDate, toDate },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-movement-${today}.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/reports")}>Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Movement</h1>
            <p className="text-sm text-gray-500 mt-1">Detailed stock in/out movements</p>
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
        </div>
      </Card>

      {isLoading ? (
        <Card><div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div></Card>
      ) : data ? (
        <>
          {/* Summary by product */}
          {data.summary_by_product.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary by Product</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Product</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Total In</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Total Out</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary_by_product.map((p) => (
                      <tr key={p.product_id} className="border-b border-gray-50">
                        <td className="px-3 py-2 font-medium">{p.product_name}</td>
                        <td className="text-right px-3 py-2 text-green-600">+{p.total_in}</td>
                        <td className="text-right px-3 py-2 text-red-600">-{p.total_out}</td>
                        <td className="text-right px-3 py-2 font-semibold">{p.net}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Movement Table */}
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Product</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Warehouse</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Qty</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Cost</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => {
                    const tc = typeColors[entry.type] || { variant: "default" as const, label: entry.type };
                    return (
                      <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">{formatDate(entry.date)}</td>
                        <td className="px-4 py-2 font-medium">{entry.product.name}</td>
                        <td className="px-4 py-2 text-gray-600">{entry.warehouse.name}</td>
                        <td className="px-4 py-2"><Badge variant={tc.variant}>{tc.label}</Badge></td>
                        <td className="text-right px-4 py-2 font-medium">{entry.quantity}</td>
                        <td className="text-right px-4 py-2">{formatCurrency(entry.cost_price)}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{entry.notes || "--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-500 font-medium">
                Total: {data.totals.total_movements} movements
              </span>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
