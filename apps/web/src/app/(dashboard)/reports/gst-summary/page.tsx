"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download } from "lucide-react";
import { useGstSummary, useExportReport } from "@/hooks/use-reports";

export default function GstSummaryPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);

  const { data, isLoading } = useGstSummary({ fromDate, toDate });
  const exportMutation = useExportReport();

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportMutation.mutateAsync({
      reportType: "gst-summary",
      format,
      filters: { fromDate, toDate },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gst-summary-${today}.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/reports")}>Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GST Summary</h1>
            <p className="text-sm text-gray-500 mt-1">Output vs Input tax with net liability</p>
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
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><div className="h-32 bg-gray-100 animate-pulse rounded" /></Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Net Liability Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <p className="text-xs text-gray-500">CGST Liability</p>
              <p className={`text-xl font-bold ${data.net_liability.cgst >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(data.net_liability.cgst)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500">SGST Liability</p>
              <p className={`text-xl font-bold ${data.net_liability.sgst >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(data.net_liability.sgst)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500">IGST Liability</p>
              <p className={`text-xl font-bold ${data.net_liability.igst >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(data.net_liability.igst)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-gray-500">Cess</p>
              <p className={`text-xl font-bold ${data.net_liability.cess >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(data.net_liability.cess)}
              </p>
            </Card>
            <Card className="border-2 border-primary-200">
              <p className="text-xs text-gray-500 font-medium">Net GST Liability</p>
              <p className={`text-xl font-bold ${data.net_liability.total >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(data.net_liability.total)}
              </p>
            </Card>
          </div>

          {/* Output Tax */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Output Tax (Sales) - {data.output_tax.invoice_count} invoices
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Rate %</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Taxable Amount</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">CGST</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">SGST</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">IGST</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Cess</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {data.output_tax.rate_wise.map((r) => (
                    <tr key={r.rate} className="border-b border-gray-50">
                      <td className="px-3 py-2 font-medium">{r.rate}%</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.taxable_amount)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.cgst)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.sgst)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.igst)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.cess)}</td>
                      <td className="text-right px-3 py-2 font-semibold">{formatCurrency(r.total_tax)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td className="px-3 py-2">Total</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.output_tax.taxable_amount)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.output_tax.cgst)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.output_tax.sgst)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.output_tax.igst)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.output_tax.cess)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.output_tax.total_tax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Input Tax */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Input Tax (Purchases) - {data.input_tax.invoice_count} invoices
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Rate %</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Taxable Amount</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">CGST</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">SGST</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">IGST</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Cess</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {data.input_tax.rate_wise.map((r) => (
                    <tr key={r.rate} className="border-b border-gray-50">
                      <td className="px-3 py-2 font-medium">{r.rate}%</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.taxable_amount)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.cgst)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.sgst)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.igst)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(r.cess)}</td>
                      <td className="text-right px-3 py-2 font-semibold">{formatCurrency(r.total_tax)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td className="px-3 py-2">Total</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.input_tax.taxable_amount)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.input_tax.cgst)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.input_tax.sgst)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.input_tax.igst)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.input_tax.cess)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(data.input_tax.total_tax)}</td>
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
