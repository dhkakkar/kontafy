"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { Download, Printer, Loader2 } from "lucide-react";

interface TrialBalanceLine {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
}

interface ApiResponse<T> {
  data: T;
}

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: lines = [], isLoading } = useQuery<TrialBalanceLine[]>({
    queryKey: ["trial-balance", asOfDate],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TrialBalanceLine[]>>("/books/reports/trial-balance", { asOfDate });
      return res.data;
    },
  });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  const handleExport = () => {
    if (lines.length === 0) return;
    const headers = ["Code", "Account", "Debit", "Credit"];
    const rows = lines.map((l) => [l.account_code, l.account_name, l.debit, l.credit]);
    rows.push(["", "Total", totalDebit, totalCredit]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial-balance-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trial Balance</h1>
          <p className="text-sm text-gray-500 mt-1">Summary of all account balances</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>Print</Button>
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport}>Export</Button>
        </div>
      </div>

      <Card>
        <div className="flex items-end gap-4">
          <Input label="As of Date" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="max-w-xs" />
        </div>
      </Card>

      <Card padding="none">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Debit</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Credit</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.account_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">{line.account_code}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{line.account_name}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{line.debit > 0 ? formatCurrency(line.debit) : "-"}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{line.credit > 0 ? formatCurrency(line.credit) : "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-3 px-4" colSpan={2}>Total</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(totalDebit)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
