"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Printer,
  Download,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface LineItem {
  account_id: string;
  code: string | null;
  name: string;
  amount: number;
}

interface ProfitLossData {
  from_date: string;
  to_date: string;
  revenue: { accounts: LineItem[]; total: number };
  cost_of_goods_sold: { accounts: LineItem[]; total: number };
  gross_profit: number;
  operating_expenses: { accounts: LineItem[]; total: number };
  operating_profit: number;
  other_expenses: { accounts: LineItem[]; total: number };
  net_profit: number;
}

const demoData: ProfitLossData = {
  from_date: "2025-04-01",
  to_date: "2026-03-13",
  revenue: {
    accounts: [
      { account_id: "1", code: "4001", name: "Sales Revenue", amount: 5200000 },
      { account_id: "2", code: "4002", name: "Service Revenue", amount: 280000 },
      { account_id: "3", code: "4003", name: "Interest Income", amount: 20000 },
    ],
    total: 5500000,
  },
  cost_of_goods_sold: {
    accounts: [
      { account_id: "4", code: "5001", name: "Cost of Goods Sold", amount: 1800000 },
    ],
    total: 1800000,
  },
  gross_profit: 3700000,
  operating_expenses: {
    accounts: [
      { account_id: "5", code: "5002", name: "Salaries & Wages", amount: 720000 },
      { account_id: "6", code: "5003", name: "Rent Expense", amount: 270000 },
      { account_id: "7", code: "5004", name: "Utilities", amount: 45000 },
      { account_id: "8", code: "5005", name: "Marketing & Advertising", amount: 180000 },
      { account_id: "9", code: "5006", name: "Office Supplies", amount: 85000 },
    ],
    total: 1300000,
  },
  operating_profit: 2400000,
  other_expenses: {
    accounts: [],
    total: 0,
  },
  net_profit: 2400000,
};

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-gray-50/70">
      <td
        colSpan={2}
        className="py-2.5 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider"
      >
        {label}
      </td>
    </tr>
  );
}

function LineItemRow({ item }: { item: LineItem }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
      <td className="py-2 px-4 pl-10 text-sm text-gray-700">
        <span className="text-xs text-gray-400 font-mono mr-2">{item.code}</span>
        {item.name}
      </td>
      <td className="py-2 px-4 text-right text-sm font-medium text-gray-700">
        {formatCurrency(item.amount)}
      </td>
    </tr>
  );
}

function SubtotalRow({
  label,
  amount,
  bold = false,
  highlight = false,
  negative = false,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  highlight?: boolean;
  negative?: boolean;
}) {
  const isNeg = amount < 0;
  return (
    <tr
      className={`border-b ${
        highlight
          ? "bg-primary-50/50 border-primary-100"
          : bold
          ? "bg-gray-50 border-gray-200"
          : "border-gray-100"
      }`}
    >
      <td
        className={`py-2.5 px-4 text-sm ${
          bold || highlight ? "font-bold text-gray-900" : "font-semibold text-gray-600"
        }`}
      >
        {label}
      </td>
      <td
        className={`py-2.5 px-4 text-right text-sm ${
          highlight
            ? "font-bold text-lg"
            : bold
            ? "font-bold"
            : "font-semibold"
        } ${
          isNeg
            ? "text-red-600"
            : highlight
            ? amount > 0
              ? "text-green-700"
              : "text-red-600"
            : "text-gray-900"
        }`}
      >
        {negative && amount > 0 && "("}
        {formatCurrency(Math.abs(amount))}
        {negative && amount > 0 && ")"}
      </td>
    </tr>
  );
}

function defaultFyStart(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
}

export default function ProfitLossPage() {
  const [fromDate, setFromDate] = useState(defaultFyStart());
  const [toDate, setToDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const { data: serverData } = useQuery<ProfitLossData>({
    queryKey: ["profit-loss", fromDate, toDate],
    queryFn: async () => {
      const res = await api.get<{ data: ProfitLossData } | ProfitLossData>(
        "/books/reports/profit-loss",
        { fromDate, toDate },
      );
      return ((res as any)?.data ?? res) as ProfitLossData;
    },
    enabled: !!fromDate && !!toDate,
  });

  const data = serverData ?? demoData;
  void demoData;

  const profitMargin =
    data.revenue.total > 0
      ? ((data.net_profit / data.revenue.total) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/books/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Profit & Loss Statement
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Income and expense summary
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Date Range + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="max-w-[160px]"
              />
              <span className="text-sm text-gray-400">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="max-w-[160px]"
              />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Net Profit</p>
              <p
                className={`text-lg font-bold ${
                  data.net_profit >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {formatCurrency(data.net_profit)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Profit Margin</p>
              <p className="text-lg font-bold text-gray-900">{profitMargin}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Particulars
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue */}
              <SectionHeader label="Revenue" />
              {data.revenue.accounts.map((item) => (
                <LineItemRow key={item.account_id} item={item} />
              ))}
              <SubtotalRow label="Total Revenue" amount={data.revenue.total} bold />

              {/* COGS */}
              {data.cost_of_goods_sold.accounts.length > 0 && (
                <>
                  <SectionHeader label="Less: Cost of Goods Sold" />
                  {data.cost_of_goods_sold.accounts.map((item) => (
                    <LineItemRow key={item.account_id} item={item} />
                  ))}
                  <SubtotalRow
                    label="Total Cost of Goods Sold"
                    amount={data.cost_of_goods_sold.total}
                    negative
                  />
                </>
              )}

              {/* Gross Profit */}
              <SubtotalRow label="Gross Profit" amount={data.gross_profit} bold />

              {/* Operating Expenses */}
              <SectionHeader label="Less: Operating Expenses" />
              {data.operating_expenses.accounts.map((item) => (
                <LineItemRow key={item.account_id} item={item} />
              ))}
              <SubtotalRow
                label="Total Operating Expenses"
                amount={data.operating_expenses.total}
                negative
              />

              {/* Operating Profit */}
              <SubtotalRow
                label="Operating Profit"
                amount={data.operating_profit}
                bold
              />

              {/* Other Expenses */}
              {data.other_expenses.accounts.length > 0 && (
                <>
                  <SectionHeader label="Less: Other Expenses" />
                  {data.other_expenses.accounts.map((item) => (
                    <LineItemRow key={item.account_id} item={item} />
                  ))}
                  <SubtotalRow
                    label="Total Other Expenses"
                    amount={data.other_expenses.total}
                    negative
                  />
                </>
              )}
            </tbody>
            <tfoot>
              {/* Net Profit */}
              <SubtotalRow
                label="Net Profit / (Loss)"
                amount={data.net_profit}
                highlight
              />
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
