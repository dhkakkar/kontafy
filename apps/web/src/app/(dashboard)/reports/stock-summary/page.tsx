"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download, AlertTriangle } from "lucide-react";
import { useStockSummary, useExportReport } from "@/hooks/use-reports";

export default function StockSummaryPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [belowReorder, setBelowReorder] = useState(false);

  const { data, isLoading } = useStockSummary({ belowReorder });
  const exportMutation = useExportReport();

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportMutation.mutateAsync({
      reportType: "stock-summary",
      format,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-summary-${today}.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/reports")}>Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Summary</h1>
            <p className="text-sm text-gray-500 mt-1">Current inventory valuation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => handleExport("excel")}>Excel</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>PDF</Button>
        </div>
      </div>

      <Card>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={belowReorder}
            onChange={(e) => setBelowReorder(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Show only items below reorder level</span>
        </label>
      </Card>

      {isLoading ? (
        <Card><div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div></Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><p className="text-xs text-gray-500">Products</p><p className="text-xl font-bold">{data.totals.total_items}</p></Card>
            <Card><p className="text-xs text-gray-500">Total Qty</p><p className="text-xl font-bold">{data.totals.total_quantity}</p></Card>
            <Card><p className="text-xs text-gray-500">Stock Value</p><p className="text-xl font-bold">{formatCurrency(data.totals.total_stock_value)}</p></Card>
            <Card><p className="text-xs text-gray-500">Selling Value</p><p className="text-xl font-bold">{formatCurrency(data.totals.total_selling_value)}</p></Card>
            <Card>
              <p className="text-xs text-gray-500">Below Reorder</p>
              <p className="text-xl font-bold text-red-600">{data.totals.below_reorder_count}</p>
            </Card>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Product</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">SKU</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Unit</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Quantity</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Cost Price</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Stock Value</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Selling Value</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.product_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.hsn_code && <div className="text-xs text-gray-500">HSN: {item.hsn_code}</div>}
                      </td>
                      <td className="px-4 py-2 text-gray-600 font-mono text-xs">{item.sku || "--"}</td>
                      <td className="px-4 py-2 text-gray-600">{item.unit}</td>
                      <td className="text-right px-4 py-2 font-medium">{item.total_quantity}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(item.purchase_price)}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(item.total_stock_value)}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(item.total_selling_value)}</td>
                      <td className="text-center px-4 py-2">
                        {item.below_reorder ? (
                          <Badge variant="danger">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low
                          </Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan={3} className="px-4 py-3">Total</td>
                    <td className="text-right px-4 py-3">{data.totals.total_quantity}</td>
                    <td className="text-right px-4 py-3" />
                    <td className="text-right px-4 py-3">{formatCurrency(data.totals.total_stock_value)}</td>
                    <td className="text-right px-4 py-3">{formatCurrency(data.totals.total_selling_value)}</td>
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
