"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  CalendarDays,
  Clock,
  CreditCard,
  ShoppingCart,
  ShoppingBag,
  Package,
  ArrowUpDown,
  FileText,
  IndianRupee,
} from "lucide-react";

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

const reportCategories: Array<{
  category: string;
  description: string;
  reports: ReportCard[];
}> = [
  {
    category: "Financial",
    description: "Core accounting reports",
    reports: [
      {
        title: "General Ledger",
        description:
          "Transaction-by-transaction detail for any account with running balance",
        href: "/reports/general-ledger",
        icon: BookOpen,
        color: "bg-teal-50 text-teal-600",
      },
      {
        title: "Day Book",
        description:
          "Chronological journal register for all entries in a date range",
        href: "/reports/day-book",
        icon: CalendarDays,
        color: "bg-rose-50 text-rose-600",
      },
      {
        title: "Receivable Aging",
        description:
          "Accounts receivable aging analysis by customer with aging buckets",
        href: "/reports/receivable-aging",
        icon: Clock,
        color: "bg-amber-50 text-amber-600",
      },
      {
        title: "Payable Aging",
        description:
          "Accounts payable aging analysis by vendor with aging buckets",
        href: "/reports/payable-aging",
        icon: CreditCard,
        color: "bg-orange-50 text-orange-600",
      },
    ],
  },
  {
    category: "Sales & Purchase",
    description: "Transaction registers and analysis",
    reports: [
      {
        title: "Sales Register",
        description:
          "All sales invoices with customer, tax, and product breakdowns",
        href: "/reports/sales-register",
        icon: ShoppingCart,
        color: "bg-green-50 text-green-600",
      },
      {
        title: "Purchase Register",
        description:
          "All purchase bills with vendor, tax, and product breakdowns",
        href: "/reports/purchase-register",
        icon: ShoppingBag,
        color: "bg-blue-50 text-blue-600",
      },
    ],
  },
  {
    category: "Inventory",
    description: "Stock valuation and movement reports",
    reports: [
      {
        title: "Stock Summary",
        description:
          "Current inventory valuation across products and warehouses",
        href: "/reports/stock-summary",
        icon: Package,
        color: "bg-purple-50 text-purple-600",
      },
      {
        title: "Stock Movement",
        description:
          "Detailed stock in/out movements with product and warehouse filters",
        href: "/reports/stock-movement",
        icon: ArrowUpDown,
        color: "bg-indigo-50 text-indigo-600",
      },
    ],
  },
  {
    category: "Tax",
    description: "GST and TDS compliance reports",
    reports: [
      {
        title: "GST Summary",
        description:
          "Output tax vs input tax with rate-wise breakdown and net liability",
        href: "/reports/gst-summary",
        icon: IndianRupee,
        color: "bg-emerald-50 text-emerald-600",
      },
      {
        title: "TDS Summary",
        description:
          "TDS deducted by section and deductee with deposit status",
        href: "/reports/tds-summary",
        icon: FileText,
        color: "bg-cyan-50 text-cyan-600",
      },
    ],
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate detailed financial, sales, inventory, and tax reports
        </p>
      </div>

      {reportCategories.map((category) => (
        <div key={category.category}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {category.category}
            </h2>
            <p className="text-sm text-gray-500">{category.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {category.reports.map((report) => (
              <Link key={report.title} href={report.href}>
                <Card hover className="h-full cursor-pointer group">
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
      ))}
    </div>
  );
}
