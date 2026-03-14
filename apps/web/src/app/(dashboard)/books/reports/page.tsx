"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  Scale,
  TrendingUp,
  Landmark,
  Banknote,
  CalendarDays,
  BookOpen,
} from "lucide-react";

const reports = [
  {
    title: "Trial Balance",
    description:
      "Summary of all account balances to verify debits equal credits",
    href: "/books/reports/trial-balance",
    icon: Scale,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Profit & Loss",
    description:
      "Revenue, expenses, and net profit for a selected date range",
    href: "/books/reports/profit-loss",
    icon: TrendingUp,
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Balance Sheet",
    description:
      "Assets, liabilities, and equity snapshot as of a specific date",
    href: "/books/reports/balance-sheet",
    icon: Landmark,
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Cash Flow",
    description:
      "Operating, investing, and financing cash movements (indirect method)",
    href: "/books/reports/cash-flow",
    icon: Banknote,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Day Book",
    description:
      "All journal entries recorded on a particular date",
    href: "/reports/day-book",
    icon: CalendarDays,
    color: "bg-rose-50 text-rose-600",
  },
  {
    title: "General Ledger",
    description:
      "Transaction-by-transaction detail for any account with running balance",
    href: "/reports/general-ledger",
    icon: BookOpen,
    color: "bg-teal-50 text-teal-600",
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Financial Reports
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate and view key financial statements for your business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reports.map((report) => (
          <Link key={report.title} href={report.href}>
            <Card
              hover
              className="h-full cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${report.color}`}
                >
                  <report.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-800 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
