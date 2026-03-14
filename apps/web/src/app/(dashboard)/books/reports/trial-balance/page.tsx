"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  Download,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface TrialBalanceEntry {
  account_id: string;
  code: string | null;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

interface TrialBalanceData {
  as_of: string;
  entries: TrialBalanceEntry[];
  totals: {
    debit: number;
    credit: number;
    balanced: boolean;
  };
}

// Demo data for static rendering
const demoData: TrialBalanceData = {
  as_of: "2026-03-13",
  entries: [
    { account_id: "1", code: "1101", name: "Cash in Hand", type: "asset", debit: 125000, credit: 0 },
    { account_id: "2", code: "1102", name: "Bank Account - HDFC", type: "asset", debit: 890000, credit: 0 },
    { account_id: "3", code: "1103", name: "Accounts Receivable", type: "asset", debit: 285000, credit: 0 },
    { account_id: "4", code: "1104", name: "GST Input Credit", type: "asset", debit: 48000, credit: 0 },
    { account_id: "5", code: "1105", name: "Inventory", type: "asset", debit: 502000, credit: 0 },
    { account_id: "6", code: "1201", name: "Office Equipment", type: "asset", debit: 250000, credit: 0 },
    { account_id: "7", code: "1202", name: "Furniture & Fixtures", type: "asset", debit: 350000, credit: 0 },
    { account_id: "8", code: "2101", name: "Accounts Payable", type: "liability", debit: 0, credit: 142000 },
    { account_id: "9", code: "2102", name: "GST Payable", type: "liability", debit: 0, credit: 48600 },
    { account_id: "10", code: "2103", name: "TDS Payable", type: "liability", debit: 0, credit: 15400 },
    { account_id: "11", code: "2104", name: "Salary Payable", type: "liability", debit: 0, credit: 474000 },
    { account_id: "12", code: "3001", name: "Owner's Capital", type: "equity", debit: 0, credit: 1500000 },
    { account_id: "13", code: "3002", name: "Retained Earnings", type: "equity", debit: 0, credit: 270000 },
    { account_id: "14", code: "4001", name: "Sales Revenue", type: "income", debit: 0, credit: 5200000 },
    { account_id: "15", code: "4002", name: "Service Revenue", type: "income", debit: 0, credit: 280000 },
    { account_id: "16", code: "4003", name: "Interest Income", type: "income", debit: 0, credit: 20000 },
    { account_id: "17", code: "5001", name: "Cost of Goods Sold", type: "expense", debit: 1800000, credit: 0 },
    { account_id: "18", code: "5002", name: "Salaries & Wages", type: "expense", debit: 720000, credit: 0 },
    { account_id: "19", code: "5003", name: "Rent Expense", type: "expense", debit: 270000, credit: 0 },
    { account_id: "20", code: "5004", name: "Utilities", type: "expense", debit: 45000, credit: 0 },
    { account_id: "21", code: "5005", name: "Marketing & Advertising", type: "expense", debit: 180000, credit: 0 },
    { account_id: "22", code: "5006", name: "Office Supplies", type: "expense", debit: 85000, credit: 0 },
  ],
  totals: {
    debit: 5550000,
    credit: 5550000,
    balanced: true,
  },
};

const typeColors: Record<string, string> = {
  asset: "info",
  liability: "warning",
  equity: "default",
  income: "success",
  expense: "danger",
};

const typeLabels: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState("2026-03-13");
  const data = demoData; // Replace with TanStack Query: useQuery(['trial-balance', asOfDate], () => api.get('/books/reports/trial-balance', { asOfDate }))

  // Group by type
  const grouped = useMemo(() => {
    const groups: Record<string, TrialBalanceEntry[]> = {};
    for (const entry of data.entries) {
      if (!groups[entry.type]) groups[entry.type] = [];
      groups[entry.type].push(entry);
    }
    return groups;
  }, [data.entries]);

  const typeOrder = ["asset", "liability", "equity", "income", "expense"];

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
            <h1 className="text-2xl font-bold text-gray-900">Trial Balance</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Summary of all account balances
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

      {/* Date Picker */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">As of:</span>
          </div>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="max-w-[180px]"
          />
          <div className="ml-auto flex items-center gap-2">
            {data.totals.balanced ? (
              <Badge variant="success" dot>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Balanced
                </span>
              </Badge>
            ) : (
              <Badge variant="danger" dot>
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Balanced
                </span>
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Trial Balance Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Code
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Type
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Debit
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody>
              {typeOrder.map((type) => {
                const entries = grouped[type];
                if (!entries || entries.length === 0) return null;

                const typeDebit = entries.reduce((s, e) => s + e.debit, 0);
                const typeCredit = entries.reduce((s, e) => s + e.credit, 0);

                return (
                  <React.Fragment key={type}>
                    {/* Type Header */}
                    <tr className="bg-gray-50/50">
                      <td
                        colSpan={5}
                        className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                      >
                        {typeLabels[type]}
                      </td>
                    </tr>
                    {entries.map((entry) => (
                      <tr
                        key={entry.account_id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono text-xs text-gray-400">
                          {entry.code}
                        </td>
                        <td className="py-2.5 px-4 text-gray-700">
                          {entry.name}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant={
                              typeColors[entry.type] as
                                | "info"
                                | "warning"
                                | "default"
                                | "success"
                                | "danger"
                            }
                          >
                            {typeLabels[entry.type]}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-gray-700">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-gray-700">
                          {entry.credit > 0
                            ? formatCurrency(entry.credit)
                            : ""}
                        </td>
                      </tr>
                    ))}
                    {/* Type Subtotal */}
                    <tr className="border-b border-gray-200">
                      <td colSpan={3} className="py-2 px-4 text-right text-xs font-semibold text-gray-500">
                        Subtotal {typeLabels[type]}
                      </td>
                      <td className="py-2 px-4 text-right text-sm font-semibold text-gray-700">
                        {typeDebit > 0 ? formatCurrency(typeDebit) : ""}
                      </td>
                      <td className="py-2 px-4 text-right text-sm font-semibold text-gray-700">
                        {typeCredit > 0 ? formatCurrency(typeCredit) : ""}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td
                  colSpan={3}
                  className="py-3 px-4 text-right text-sm font-bold text-gray-900"
                >
                  Total
                </td>
                <td className="py-3 px-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(data.totals.debit)}
                </td>
                <td className="py-3 px-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(data.totals.credit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
