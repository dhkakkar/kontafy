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
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

interface CashFlowItem {
  name: string;
  amount: number;
}

interface CashFlowData {
  from_date: string;
  to_date: string;
  operating_activities: {
    net_profit: number;
    non_cash_adjustments: CashFlowItem[];
    working_capital_changes: CashFlowItem[];
    total: number;
  };
  investing_activities: {
    items: CashFlowItem[];
    total: number;
  };
  financing_activities: {
    items: CashFlowItem[];
    total: number;
  };
  net_change_in_cash: number;
  opening_cash: number;
  closing_cash: number;
}

const demoData: CashFlowData = {
  from_date: "2025-04-01",
  to_date: "2026-03-13",
  operating_activities: {
    net_profit: 2400000,
    non_cash_adjustments: [
      { name: "Depreciation & Amortization", amount: 37500 },
    ],
    working_capital_changes: [
      { name: "Change in Accounts Receivable", amount: -85000 },
      { name: "Change in Inventory", amount: -120000 },
      { name: "Change in GST Input Credit", amount: -12000 },
      { name: "Change in Accounts Payable", amount: 42000 },
      { name: "Change in GST Payable", amount: 8600 },
      { name: "Change in Salary Payable", amount: 74000 },
    ],
    total: 2345100,
  },
  investing_activities: {
    items: [
      { name: "Purchase of Office Equipment", amount: -75000 },
      { name: "Purchase of Furniture", amount: -50000 },
    ],
    total: -125000,
  },
  financing_activities: {
    items: [
      { name: "Change in Owner's Capital", amount: 200000 },
    ],
    total: 200000,
  },
  net_change_in_cash: 2420100,
  opening_cash: 500000,
  closing_cash: 1015000,
};

function FlowSection({
  title,
  color,
  children,
  total,
  totalLabel,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="mb-1">
      <div className={`px-4 py-2.5 ${color}`}>
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
        <tfoot>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <td className="py-2.5 px-4 text-sm font-bold text-gray-900">
              {totalLabel}
            </td>
            <td
              className={`py-2.5 px-4 text-right text-sm font-bold ${
                total >= 0 ? "text-green-700" : "text-red-600"
              }`}
            >
              {total < 0 && "("}
              {formatCurrency(Math.abs(total))}
              {total < 0 && ")"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FlowRow({ name, amount }: { name: string; amount: number }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
      <td className="py-2 px-4 pl-8 text-sm text-gray-700">{name}</td>
      <td
        className={`py-2 px-4 text-right text-sm font-medium ${
          amount >= 0 ? "text-gray-700" : "text-red-600"
        }`}
      >
        {amount < 0 && "("}
        {formatCurrency(Math.abs(amount))}
        {amount < 0 && ")"}
      </td>
    </tr>
  );
}

function defaultFyStart(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
}

export default function CashFlowPage() {
  const [fromDate, setFromDate] = useState(defaultFyStart());
  const [toDate, setToDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const { data: serverData } = useQuery<CashFlowData>({
    queryKey: ["cash-flow", fromDate, toDate],
    queryFn: async () => {
      const res = await api.get<{ data: CashFlowData } | CashFlowData>(
        "/books/reports/cash-flow",
        { fromDate, toDate },
      );
      return ((res as any)?.data ?? res) as CashFlowData;
    },
    enabled: !!fromDate && !!toDate,
  });

  const data = serverData ?? demoData;
  void demoData;

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
              Cash Flow Statement
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Indirect method - cash movements by activity
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

      {/* Date Range + Summary Cards */}
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
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Opening Cash</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(data.opening_cash)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ArrowDownCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Closing Cash</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(data.closing_cash)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cash Flow Statement */}
      <Card padding="none">
        <div className="overflow-x-auto">
          {/* Operating Activities */}
          <FlowSection
            title="A. Cash Flow from Operating Activities"
            color="bg-green-50/50"
            total={data.operating_activities.total}
            totalLabel="Net Cash from Operating Activities"
          >
            <FlowRow name="Net Profit" amount={data.operating_activities.net_profit} />
            {data.operating_activities.non_cash_adjustments.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={2}
                    className="py-1.5 px-4 pl-6 text-xs font-semibold text-gray-500 uppercase"
                  >
                    Adjustments for Non-Cash Items
                  </td>
                </tr>
                {data.operating_activities.non_cash_adjustments.map((item, i) => (
                  <FlowRow key={i} name={item.name} amount={item.amount} />
                ))}
              </>
            )}
            {data.operating_activities.working_capital_changes.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={2}
                    className="py-1.5 px-4 pl-6 text-xs font-semibold text-gray-500 uppercase"
                  >
                    Changes in Working Capital
                  </td>
                </tr>
                {data.operating_activities.working_capital_changes.map(
                  (item, i) => (
                    <FlowRow key={i} name={item.name} amount={item.amount} />
                  )
                )}
              </>
            )}
          </FlowSection>

          {/* Investing Activities */}
          <FlowSection
            title="B. Cash Flow from Investing Activities"
            color="bg-blue-50/50"
            total={data.investing_activities.total}
            totalLabel="Net Cash from Investing Activities"
          >
            {data.investing_activities.items.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="py-4 text-center text-sm text-gray-400"
                >
                  No investing activity in this period
                </td>
              </tr>
            ) : (
              data.investing_activities.items.map((item, i) => (
                <FlowRow key={i} name={item.name} amount={item.amount} />
              ))
            )}
          </FlowSection>

          {/* Financing Activities */}
          <FlowSection
            title="C. Cash Flow from Financing Activities"
            color="bg-purple-50/50"
            total={data.financing_activities.total}
            totalLabel="Net Cash from Financing Activities"
          >
            {data.financing_activities.items.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="py-4 text-center text-sm text-gray-400"
                >
                  No financing activity in this period
                </td>
              </tr>
            ) : (
              data.financing_activities.items.map((item, i) => (
                <FlowRow key={i} name={item.name} amount={item.amount} />
              ))
            )}
          </FlowSection>

          {/* Summary */}
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t-2 border-gray-300 bg-gray-100">
                <td className="py-3 px-4 text-sm font-bold text-gray-900">
                  Net Change in Cash (A + B + C)
                </td>
                <td
                  className={`py-3 px-4 text-right text-sm font-bold ${
                    data.net_change_in_cash >= 0
                      ? "text-green-700"
                      : "text-red-600"
                  }`}
                >
                  {data.net_change_in_cash < 0 && "("}
                  {formatCurrency(Math.abs(data.net_change_in_cash))}
                  {data.net_change_in_cash < 0 && ")"}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-4 text-sm text-gray-600">
                  Opening Cash & Cash Equivalents
                </td>
                <td className="py-2 px-4 text-right text-sm font-medium text-gray-700">
                  {formatCurrency(data.opening_cash)}
                </td>
              </tr>
              <tr className="bg-amber-50/50 border-t-2 border-amber-200">
                <td className="py-3 px-4 text-sm font-bold text-gray-900">
                  Closing Cash & Cash Equivalents
                </td>
                <td className="py-3 px-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(data.closing_cash)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
