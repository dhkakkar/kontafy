"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { Download, Loader2 } from "lucide-react";

interface PLSection {
  label: string;
  accounts: Array<{ account_name: string; account_code: string; amount: number }>;
  total: number;
}

interface PLReport {
  income: PLSection;
  expenses: PLSection;
  net_profit: number;
  period: { start: string; end: string };
}

interface ApiResponse<T> {
  data: T;
}

export default function ProfitLossPage() {
  const today = new Date();
  const fyStart = today.getMonth() >= 3 ? `${today.getFullYear()}-04-01` : `${today.getFullYear() - 1}-04-01`;
  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const { data: report, isLoading } = useQuery<PLReport>({
    queryKey: ["profit-loss", startDate, endDate],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PLReport>>("/books/reports/profit-loss", {
        start_date: startDate,
        end_date: endDate,
      });
      return res.data;
    },
  });

  const renderSection = (section: PLSection, colorClass: string) => (
    <>
      <tr className="bg-gray-50">
        <td className="py-3 px-4 font-bold text-gray-900" colSpan={2}>{section.label}</td>
      </tr>
      {section.accounts.map((a) => (
        <tr key={a.account_code} className="border-b border-gray-50 hover:bg-gray-50/50">
          <td className="py-2.5 px-4 pl-8 text-gray-700">{a.account_name}</td>
          <td className={`py-2.5 px-4 text-right font-medium ${colorClass}`}>{formatCurrency(a.amount)}</td>
        </tr>
      ))}
      <tr className="border-t border-gray-200 font-semibold">
        <td className="py-3 px-4 pl-8">Total {section.label}</td>
        <td className={`py-3 px-4 text-right ${colorClass}`}>{formatCurrency(section.total)}</td>
      </tr>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-sm text-gray-500 mt-1">Income and expense summary</p>
        </div>
        <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />}>Export</Button>
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
                {renderSection(report.income, "text-success-700")}
                {renderSection(report.expenses, "text-danger-700")}
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
