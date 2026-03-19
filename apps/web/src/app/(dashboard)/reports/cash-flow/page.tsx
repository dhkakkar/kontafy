"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { Download, Loader2 } from "lucide-react";

interface CashFlowSection {
  label: string;
  items: Array<{ description: string; amount: number }>;
  total: number;
}

interface CashFlowReport {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  net_change: number;
  opening_balance: number;
  closing_balance: number;
}

interface ApiResponse<T> {
  data: T;
}

export default function CashFlowPage() {
  const today = new Date();
  const fyStart = today.getMonth() >= 3 ? `${today.getFullYear()}-04-01` : `${today.getFullYear() - 1}-04-01`;
  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const { data: report, isLoading } = useQuery<CashFlowReport>({
    queryKey: ["cash-flow", startDate, endDate],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CashFlowReport>>("/books/reports/cash-flow", {
        start_date: startDate,
        end_date: endDate,
      });
      return res.data;
    },
  });

  const renderSection = (section: CashFlowSection) => (
    <>
      <tr className="bg-gray-50">
        <td className="py-3 px-4 font-bold text-gray-900" colSpan={2}>{section.label}</td>
      </tr>
      {section.items.map((item, i) => (
        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
          <td className="py-2.5 px-4 pl-8 text-gray-700">{item.description}</td>
          <td className={`py-2.5 px-4 text-right font-medium ${item.amount >= 0 ? "text-success-700" : "text-danger-700"}`}>
            {formatCurrency(item.amount)}
          </td>
        </tr>
      ))}
      <tr className="border-t border-gray-200 font-semibold">
        <td className="py-3 px-4 pl-8">Net {section.label}</td>
        <td className={`py-3 px-4 text-right ${section.total >= 0 ? "text-success-700" : "text-danger-700"}`}>
          {formatCurrency(section.total)}
        </td>
      </tr>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Flow Statement</h1>
          <p className="text-sm text-gray-500 mt-1">Operating, investing, and financing activities</p>
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
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {renderSection(report.operating)}
                {renderSection(report.investing)}
                {renderSection(report.financing)}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td className="py-3 px-4 font-semibold">Opening Cash Balance</td>
                  <td className="py-3 px-4 text-right font-semibold">{formatCurrency(report.opening_balance)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Net Change in Cash</td>
                  <td className={`py-3 px-4 text-right font-semibold ${report.net_change >= 0 ? "text-success-700" : "text-danger-700"}`}>
                    {formatCurrency(report.net_change)}
                  </td>
                </tr>
                <tr className="border-t-2 border-gray-300 bg-primary-50 font-bold text-lg">
                  <td className="py-4 px-4">Closing Cash Balance</td>
                  <td className="py-4 px-4 text-right">{formatCurrency(report.closing_balance)}</td>
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
