"use client";

import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { Download, Printer, Loader2 } from "lucide-react";

interface PLAccount {
  account_id: string;
  code: string | null;
  name: string;
  amount: number;
}

interface PLSection {
  accounts: PLAccount[];
  total: number;
}

interface PLReport {
  from_date: string;
  to_date: string;
  revenue: PLSection;
  cost_of_goods_sold: PLSection;
  gross_profit: number;
  operating_expenses: PLSection;
  operating_profit: number;
  other_expenses: PLSection;
  net_profit: number;
}

export default function ProfitLossPage() {
  const today = new Date();
  const fyStart = today.getMonth() >= 3 ? `${today.getFullYear()}-04-01` : `${today.getFullYear() - 1}-04-01`;
  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading } = useQuery<PLReport>({
    queryKey: ["profit-loss", startDate, endDate],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: PLReport }>("/books/reports/profit-loss", {
        fromDate: startDate,
        toDate: endDate,
      });
      return res.data;
    },
  });

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Profit & Loss Statement</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #111; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { padding: 8px 12px; text-align: left; }
            .text-right { text-align: right; }
            .section-header { background: #f3f4f6; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; }
            .line-item td { padding-left: 32px; color: #4b5563; }
            .subtotal { border-top: 1px solid #d1d5db; font-weight: 600; }
            .subtotal td { padding-left: 32px; }
            .summary-row { border-top: 2px solid #9ca3af; font-weight: 700; background: #f0f9ff; font-size: 14px; }
            .net-profit-row { border-top: 2px solid #374151; font-weight: 700; background: #ecfdf5; font-size: 15px; }
            .placeholder { color: #9ca3af; }
            .text-green { color: #15803d; }
            .text-red { color: #dc2626; }
            .header-section { text-align: center; margin-bottom: 24px; }
            .header-section h1 { font-size: 20px; margin: 0; }
            .header-section p { color: #6b7280; font-size: 12px; margin: 4px 0 0; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header-section">
            <h1>Profit & Loss Statement</h1>
            <p>${startDate} to ${endDate}</p>
          </div>
          ${printContent}
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handleExport = () => {
    if (!report) return;
    const rows = [["Particulars", "Amount"]];

    // Trading Account
    rows.push(["--- TRADING ACCOUNT ---", ""]);
    rows.push(["Sales", String(report.revenue?.total ?? 0)]);
    (report.revenue?.accounts || []).forEach((a) => rows.push([`  ${a.name}`, String(a.amount)]));
    rows.push(["Cr. Note / Sale Return", "-"]);
    rows.push(["Purchases", String(report.cost_of_goods_sold?.total ?? 0)]);
    (report.cost_of_goods_sold?.accounts || []).forEach((a) => rows.push([`  ${a.name}`, String(a.amount)]));
    rows.push(["Dr. Note / Purchase Return", "-"]);
    rows.push(["Tax Payable", "-"]);
    rows.push(["Tax Receivable", "-"]);
    rows.push(["Opening Stock", "-"]);
    rows.push(["Closing Stock", "-"]);
    rows.push(["Gross Profit", String(report.gross_profit ?? 0)]);

    // P&L Account
    rows.push(["--- PROFIT & LOSS ACCOUNT ---", ""]);
    rows.push(["Gross Profit (B/F)", String(report.gross_profit ?? 0)]);
    (report.operating_expenses?.accounts || []).forEach((a) => rows.push([`  ${a.name}`, String(a.amount)]));
    rows.push(["Total Operating Expenses", String(report.operating_expenses?.total ?? 0)]);
    (report.other_expenses?.accounts || []).forEach((a) => rows.push([`  ${a.name}`, String(a.amount)]));
    rows.push(["Total Other Expenses", String(report.other_expenses?.total ?? 0)]);
    rows.push(["Net Profit", String(report.net_profit)]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPlaceholderRow = (label: string, sign: string) => (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
      <td className="py-2.5 px-4 pl-10 text-gray-500">
        {label} <span className="text-xs text-gray-400 ml-1">({sign})</span>
      </td>
      <td className="py-2.5 px-4 text-right text-gray-400">-</td>
    </tr>
  );

  const renderAccountRows = (accounts: PLAccount[], colorClass: string) =>
    (accounts || []).map((a) => (
      <tr key={a.account_id || a.code} className="border-b border-gray-50 hover:bg-gray-50/50">
        <td className="py-2.5 px-4 pl-10 text-gray-700">{a.name}</td>
        <td className={`py-2.5 px-4 text-right font-medium ${colorClass}`}>{formatCurrency(Math.abs(a.amount))}</td>
      </tr>
    ));

  const renderSubtotalRow = (label: string, amount: number, colorClass: string) => (
    <tr className="border-t border-gray-200">
      <td className="py-2.5 px-4 pl-10 font-semibold text-gray-700">{label}</td>
      <td className={`py-2.5 px-4 text-right font-semibold ${colorClass}`}>{formatCurrency(Math.abs(amount))}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-sm text-gray-500 mt-1">Trading and Profit & Loss Account</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
            Print
          </Button>
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-end gap-4">
          <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="max-w-xs" />
          <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="max-w-xs" />
        </div>
      </Card>

      <Card padding="none">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : report ? (
          <div ref={printRef} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Particulars</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">Amount</th>
                </tr>
              </thead>

              <tbody>
                {/* ============ TRADING ACCOUNT ============ */}
                <tr className="bg-blue-50 border-b border-blue-100">
                  <td className="py-3 px-4 font-bold text-blue-900 text-xs uppercase tracking-wider" colSpan={2}>
                    Trading Account
                  </td>
                </tr>

                {/* Sales (+) */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <td className="py-2.5 px-4 pl-6 font-semibold text-gray-800">Sales</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-green-700">
                    {formatCurrency(report.revenue?.total ?? 0)}
                  </td>
                </tr>
                {renderAccountRows(report.revenue?.accounts || [], "text-green-700")}

                {/* Cr. Note / Sale Return (-) */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <td className="py-2.5 px-4 pl-6 font-semibold text-gray-800">
                    Cr. Note / Sale Return <span className="text-xs text-gray-400 font-normal">(-)</span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-gray-400">-</td>
                </tr>

                {/* Purchases (-) */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <td className="py-2.5 px-4 pl-6 font-semibold text-gray-800">Purchases</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-red-700">
                    {formatCurrency(report.cost_of_goods_sold?.total ?? 0)}
                  </td>
                </tr>
                {renderAccountRows(report.cost_of_goods_sold?.accounts || [], "text-red-700")}

                {/* Dr. Note / Purchase Return (+) */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <td className="py-2.5 px-4 pl-6 font-semibold text-gray-800">
                    Dr. Note / Purchase Return <span className="text-xs text-gray-400 font-normal">(+)</span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-gray-400">-</td>
                </tr>

                {/* Tax Payable (-) */}
                {renderPlaceholderRow("Tax Payable", "-")}

                {/* Tax Receivable (+) */}
                {renderPlaceholderRow("Tax Receivable", "+")}

                {/* Opening Stock (-) */}
                {renderPlaceholderRow("Opening Stock", "-")}

                {/* Closing Stock (+) */}
                {renderPlaceholderRow("Closing Stock", "+")}

                {/* Gross Profit */}
                <tr className="border-t-2 border-gray-300 bg-emerald-50">
                  <td className="py-3 px-4 pl-6 font-bold text-emerald-900">Gross Profit</td>
                  <td className={`py-3 px-4 text-right font-bold text-base ${(report.gross_profit ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatCurrency(report.gross_profit ?? 0)}
                  </td>
                </tr>

                {/* ============ PROFIT & LOSS ACCOUNT ============ */}
                <tr className="bg-blue-50 border-b border-blue-100 border-t-2 border-t-blue-200">
                  <td className="py-3 px-4 font-bold text-blue-900 text-xs uppercase tracking-wider" colSpan={2}>
                    Profit & Loss Account
                  </td>
                </tr>

                {/* Gross Profit B/F */}
                <tr className="bg-emerald-50/50 border-b border-gray-100">
                  <td className="py-2.5 px-4 pl-6 font-semibold text-gray-800">Gross Profit (Brought Forward)</td>
                  <td className={`py-2.5 px-4 text-right font-semibold ${(report.gross_profit ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatCurrency(report.gross_profit ?? 0)}
                  </td>
                </tr>

                {/* Other Income (+) */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <td className="py-2.5 px-4 pl-6 font-semibold text-gray-800">
                    Other Income <span className="text-xs text-gray-400 font-normal">(+)</span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-gray-400">-</td>
                </tr>

                {/* Operating Expenses (-) */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <td className="py-2.5 px-4 pl-6 font-semibold text-gray-800">Operating Expenses (Indirect)</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-red-700">
                    {formatCurrency(report.operating_expenses?.total ?? 0)}
                  </td>
                </tr>
                {renderAccountRows(report.operating_expenses?.accounts || [], "text-red-700")}
                {(report.operating_expenses?.accounts?.length ?? 0) > 0 &&
                  renderSubtotalRow("Total Operating Expenses", report.operating_expenses?.total ?? 0, "text-red-700")}

                {/* Other Expenses (-) */}
                {((report.other_expenses?.accounts?.length ?? 0) > 0 || (report.other_expenses?.total ?? 0) !== 0) && (
                  <>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <td className="py-2.5 px-4 pl-6 font-semibold text-gray-800">Other Expenses</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-red-700">
                        {formatCurrency(report.other_expenses?.total ?? 0)}
                      </td>
                    </tr>
                    {renderAccountRows(report.other_expenses?.accounts || [], "text-red-700")}
                    {(report.other_expenses?.accounts?.length ?? 0) > 0 &&
                      renderSubtotalRow("Total Other Expenses", report.other_expenses?.total ?? 0, "text-red-700")}
                  </>
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-gray-400 bg-emerald-50 font-bold">
                  <td className="py-4 px-4 text-base text-gray-900">Net Profit</td>
                  <td className={`py-4 px-4 text-right text-lg ${report.net_profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatCurrency(report.net_profit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">No data available</div>
        )}
      </Card>
    </div>
  );
}
