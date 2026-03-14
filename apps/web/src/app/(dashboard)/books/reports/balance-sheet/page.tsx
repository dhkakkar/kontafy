"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  Download,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface LineItem {
  account_id: string;
  code: string | null;
  name: string;
  amount: number;
}

interface Section {
  accounts: LineItem[];
  total: number;
}

interface BalanceSheetData {
  as_of: string;
  assets: {
    current_assets: Section;
    fixed_assets: Section;
    other_assets: Section;
    total: number;
  };
  liabilities: {
    current_liabilities: Section;
    long_term_liabilities: Section;
    total: number;
  };
  equity: {
    accounts: LineItem[];
    retained_earnings: number;
    total: number;
  };
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

const demoData: BalanceSheetData = {
  as_of: "2026-03-13",
  assets: {
    current_assets: {
      accounts: [
        { account_id: "1", code: "1101", name: "Cash in Hand", amount: 125000 },
        { account_id: "2", code: "1102", name: "Bank Account - HDFC", amount: 890000 },
        { account_id: "3", code: "1103", name: "Accounts Receivable", amount: 285000 },
        { account_id: "4", code: "1104", name: "GST Input Credit", amount: 48000 },
        { account_id: "5", code: "1105", name: "Inventory", amount: 502000 },
      ],
      total: 1850000,
    },
    fixed_assets: {
      accounts: [
        { account_id: "6", code: "1201", name: "Office Equipment", amount: 250000 },
        { account_id: "7", code: "1202", name: "Furniture & Fixtures", amount: 350000 },
      ],
      total: 600000,
    },
    other_assets: { accounts: [], total: 0 },
    total: 2450000,
  },
  liabilities: {
    current_liabilities: {
      accounts: [
        { account_id: "8", code: "2101", name: "Accounts Payable", amount: 142000 },
        { account_id: "9", code: "2102", name: "GST Payable", amount: 48600 },
        { account_id: "10", code: "2103", name: "TDS Payable", amount: 15400 },
        { account_id: "11", code: "2104", name: "Salary Payable", amount: 474000 },
      ],
      total: 680000,
    },
    long_term_liabilities: { accounts: [], total: 0 },
    total: 680000,
  },
  equity: {
    accounts: [
      { account_id: "12", code: "3001", name: "Owner's Capital", amount: 1500000 },
      { account_id: "13", code: "3002", name: "Retained Earnings", amount: 270000 },
    ],
    retained_earnings: 0,
    total: 1770000,
  },
  total_liabilities_and_equity: 2450000,
  is_balanced: true,
};

function SectionGroup({
  title,
  accounts,
  total,
  totalLabel,
}: {
  title: string;
  accounts: LineItem[];
  total: number;
  totalLabel: string;
}) {
  if (accounts.length === 0) return null;

  return (
    <>
      <tr className="bg-gray-50/50">
        <td
          colSpan={2}
          className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider"
        >
          {title}
        </td>
      </tr>
      {accounts.map((item) => (
        <tr
          key={item.account_id}
          className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors"
        >
          <td className="py-2 px-4 pl-10 text-sm text-gray-700">
            <span className="text-xs text-gray-400 font-mono mr-2">
              {item.code}
            </span>
            {item.name}
          </td>
          <td className="py-2 px-4 text-right text-sm font-medium text-gray-700">
            {formatCurrency(item.amount)}
          </td>
        </tr>
      ))}
      <tr className="border-b border-gray-200">
        <td className="py-2 px-4 text-sm font-semibold text-gray-600">
          {totalLabel}
        </td>
        <td className="py-2 px-4 text-right text-sm font-semibold text-gray-900">
          {formatCurrency(total)}
        </td>
      </tr>
    </>
  );
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState("2026-03-13");
  const data = demoData; // Replace with TanStack Query

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
            <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Financial position as of a date
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

      {/* Date Picker + Balance Status */}
      <Card>
        <div className="flex items-center gap-4">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">As of:</span>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="max-w-[180px]"
          />
          <div className="ml-auto flex items-center gap-2">
            {data.is_balanced ? (
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

      {/* Balance Sheet in two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Assets */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-200 bg-blue-50/30">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Assets
            </h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <SectionGroup
                title="Current Assets"
                accounts={data.assets.current_assets.accounts}
                total={data.assets.current_assets.total}
                totalLabel="Total Current Assets"
              />
              <SectionGroup
                title="Fixed Assets"
                accounts={data.assets.fixed_assets.accounts}
                total={data.assets.fixed_assets.total}
                totalLabel="Total Fixed Assets"
              />
              <SectionGroup
                title="Other Assets"
                accounts={data.assets.other_assets.accounts}
                total={data.assets.other_assets.total}
                totalLabel="Total Other Assets"
              />
            </tbody>
            <tfoot>
              <tr className="bg-blue-50/50 border-t-2 border-blue-200">
                <td className="py-3 px-4 text-sm font-bold text-gray-900">
                  Total Assets
                </td>
                <td className="py-3 px-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(data.assets.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>

        {/* Liabilities & Equity */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-200 bg-purple-50/30">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Liabilities & Equity
            </h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <SectionGroup
                title="Current Liabilities"
                accounts={data.liabilities.current_liabilities.accounts}
                total={data.liabilities.current_liabilities.total}
                totalLabel="Total Current Liabilities"
              />
              <SectionGroup
                title="Long-term Liabilities"
                accounts={data.liabilities.long_term_liabilities.accounts}
                total={data.liabilities.long_term_liabilities.total}
                totalLabel="Total Long-term Liabilities"
              />
              {/* Liabilities Subtotal */}
              <tr className="border-b border-gray-200 bg-gray-50/70">
                <td className="py-2.5 px-4 text-sm font-bold text-gray-700">
                  Total Liabilities
                </td>
                <td className="py-2.5 px-4 text-right text-sm font-bold text-gray-700">
                  {formatCurrency(data.liabilities.total)}
                </td>
              </tr>

              {/* Equity */}
              <tr className="bg-gray-50/50">
                <td
                  colSpan={2}
                  className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  Equity
                </td>
              </tr>
              {data.equity.accounts.map((item) => (
                <tr
                  key={item.account_id}
                  className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors"
                >
                  <td className="py-2 px-4 pl-10 text-sm text-gray-700">
                    <span className="text-xs text-gray-400 font-mono mr-2">
                      {item.code}
                    </span>
                    {item.name}
                  </td>
                  <td className="py-2 px-4 text-right text-sm font-medium text-gray-700">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
              {data.equity.retained_earnings !== 0 && (
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-4 pl-10 text-sm text-gray-700 italic">
                    Current Year Earnings
                  </td>
                  <td className="py-2 px-4 text-right text-sm font-medium text-gray-700">
                    {formatCurrency(data.equity.retained_earnings)}
                  </td>
                </tr>
              )}
              <tr className="border-b border-gray-200">
                <td className="py-2 px-4 text-sm font-semibold text-gray-600">
                  Total Equity
                </td>
                <td className="py-2 px-4 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(data.equity.total)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-purple-50/50 border-t-2 border-purple-200">
                <td className="py-3 px-4 text-sm font-bold text-gray-900">
                  Total Liabilities & Equity
                </td>
                <td className="py-3 px-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(data.total_liabilities_and_equity)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>

      {/* Balance check bar */}
      <Card
        className={
          data.is_balanced
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.is_balanced ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p
                className={`text-sm font-semibold ${
                  data.is_balanced ? "text-green-800" : "text-red-800"
                }`}
              >
                {data.is_balanced
                  ? "Balance sheet is balanced"
                  : "Balance sheet is NOT balanced"}
              </p>
              <p
                className={`text-xs ${
                  data.is_balanced ? "text-green-600" : "text-red-600"
                }`}
              >
                Assets ({formatCurrency(data.assets.total)}) ={" "}
                Liabilities + Equity (
                {formatCurrency(data.total_liabilities_and_equity)})
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Difference</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(
                Math.abs(data.assets.total - data.total_liabilities_and_equity)
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
