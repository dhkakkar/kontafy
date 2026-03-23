"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { Download, Loader2 } from "lucide-react";

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

  const renderSection = (section: PLSection | undefined, label: string, colorClass: string) => {
    if (!section) return null;
    return (
      <>
        <tr className="bg-gray-50">
          <td className="py-3 px-4 font-bold text-gray-900" colSpan={2}>{label}</td>
        </tr>
        {(section.accounts || []).map((a) => (
          <tr key={a.account_id || a.code} className="border-b border-gray-50 hover:bg-gray-50/50">
            <td className="py-2.5 px-4 pl-8 text-gray-700">{a.name}</td>
            <td className={`py-2.5 px-4 text-right font-medium ${colorClass}`}>{formatCurrency(a.amount)}</td>
          </tr>
        ))}
        <tr className="border-t border-gray-200 font-semibold">
          <td className="py-3 px-4 pl-8">Total {label}</td>
          <td className={`py-3 px-4 text-right ${colorClass}`}>{formatCurrency(section.total)}</td>
        </tr>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-sm text-gray-500 mt-1">Income and expense summary</p>
        </div>
        <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => {
          if (!report) return;
          const rows = [["Account", "Amount"]];
          (report.revenue?.accounts || []).forEach((a) => rows.push([a.name, String(a.amount)]));
          rows.push(["Total Revenue", String(report.revenue?.total ?? 0)]);
          (report.cost_of_goods_sold?.accounts || []).forEach((a) => rows.push([a.name, String(a.amount)]));
          rows.push(["Gross Profit", String(report.gross_profit ?? 0)]);
          (report.operating_expenses?.accounts || []).forEach((a) => rows.push([a.name, String(a.amount)]));
          rows.push(["Operating Profit", String(report.operating_profit ?? 0)]);
          (report.other_expenses?.accounts || []).forEach((a) => rows.push([a.name, String(a.amount)]));
          rows.push(["Net Profit", String(report.net_profit)]);
          const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `profit-loss-${startDate}-to-${endDate}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}>Export</Button>
      </div>

      <Card>
        <div className="flex items-end gap-4">
          <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="max-w-xs" />
          <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="max-w-xs" />
        </div>
      </Card>

      <Card padding="none">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : report ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {renderSection(report.revenue, "Revenue", "text-success-700")}
                {renderSection(report.cost_of_goods_sold, "Cost of Goods Sold", "text-danger-700")}
                {report.gross_profit !== undefined && (
                  <tr className="border-t border-gray-200 font-semibold bg-gray-50">
                    <td className="py-3 px-4">Gross Profit</td>
                    <td className={`py-3 px-4 text-right ${report.gross_profit >= 0 ? "text-success-700" : "text-danger-700"}`}>{formatCurrency(report.gross_profit)}</td>
                  </tr>
                )}
                {renderSection(report.operating_expenses, "Operating Expenses", "text-danger-700")}
                {renderSection(report.other_expenses, "Other Expenses", "text-danger-700")}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-primary-50 font-bold text-lg">
                  <td className="py-4 px-4">Net Profit</td>
                  <td className={`py-4 px-4 text-right ${report.net_profit >= 0 ? "text-success-700" : "text-danger-700"}`}>
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
