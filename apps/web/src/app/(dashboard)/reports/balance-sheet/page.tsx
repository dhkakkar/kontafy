"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { Download, Loader2 } from "lucide-react";

interface BSSection {
  label: string;
  accounts: Array<{ account_name: string; account_code: string; amount: number }>;
  total: number;
}

interface BSReport {
  assets: BSSection;
  liabilities: BSSection;
  equity: BSSection;
  as_of: string;
}

interface ApiResponse<T> {
  data: T;
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: report, isLoading } = useQuery<BSReport>({
    queryKey: ["balance-sheet", asOfDate],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BSReport>>("/books/reports/balance-sheet", { asOfDate });
      return res.data;
    },
  });

  const renderSection = (section: BSSection) => (
    <>
      <tr className="bg-gray-50">
        <td className="py-3 px-4 font-bold text-gray-900" colSpan={2}>{section.label}</td>
      </tr>
      {(section.accounts || []).map((a) => (
        <tr key={a.account_code} className="border-b border-gray-50 hover:bg-gray-50/50">
          <td className="py-2.5 px-4 pl-8 text-gray-700">{a.account_name}</td>
          <td className="py-2.5 px-4 text-right font-medium text-gray-900">{formatCurrency(a.amount)}</td>
        </tr>
      ))}
      <tr className="border-t border-gray-200 font-semibold">
        <td className="py-3 px-4 pl-8">Total {section.label}</td>
        <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(section.total)}</td>
      </tr>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-sm text-gray-500 mt-1">Assets, liabilities, and equity</p>
        </div>
        <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => {
          if (!report) return;
          const rows = [["Account", "Amount"]];
          const addSection = (s: BSSection) => {
            (s.accounts || []).forEach((a) => rows.push([a.account_name, String(a.amount)]));
            rows.push([`Total ${s.label}`, String(s.total)]);
          };
          addSection(report.assets);
          addSection(report.liabilities);
          addSection(report.equity);
          const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `balance-sheet-${asOfDate}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}>Export</Button>
      </div>

      <Card>
        <div className="flex items-end gap-4">
          <Input label="As of Date" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="max-w-xs" />
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
                {renderSection(report.assets)}
                {renderSection(report.liabilities)}
                {renderSection(report.equity)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">No data available</div>
        )}
      </Card>
    </div>
  );
}
