"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
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
  BarChart3,
  TrendingUp,
  Scale,
  Landmark,
  Wallet,
  ClipboardCheck,
  Receipt,
  FileSpreadsheet,
  Hash,
  Users,
  UserCheck,
  UserMinus,
  Layers,
  PackageSearch,
  Warehouse,
  ArrowLeftRight,
  ListOrdered,
  PieChart,
  BadgeIndianRupee,
  CircleDollarSign,
  ScrollText,
  Share2,
  AlertTriangle,
  Tag,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey =
  | "all"
  | "financial"
  | "gst"
  | "transaction"
  | "party"
  | "item"
  | "summary";

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

interface ReportCategory {
  category: string;
  description: string;
  tab: TabKey;
  reports: ReportCard[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const reportCategories: ReportCategory[] = [
  // ── Financial ──────────────────────────────────────────────────────────
  {
    category: "Financial",
    description: "Core accounting and financial statements",
    tab: "financial",
    reports: [
      {
        title: "Balance Sheet",
        description:
          "Statement of assets, liabilities, and equity at a point in time",
        href: "/reports/balance-sheet",
        icon: Scale,
        color: "bg-blue-50 text-blue-600",
      },
      {
        title: "Profit And Loss Report",
        description:
          "Revenue, expenses, and net profit over a selected period",
        href: "/reports/profit-loss",
        icon: TrendingUp,
        color: "bg-green-50 text-green-600",
      },
      {
        title: "Trial Balance",
        description:
          "Summary of all ledger balances to verify debits equal credits",
        href: "/reports/trial-balance",
        icon: BarChart3,
        color: "bg-violet-50 text-violet-600",
      },
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
        title: "Cash and Bank Report",
        description:
          "Cash and bank balances with inflow/outflow summary",
        href: "/reports/cash-flow",
        icon: Landmark,
        color: "bg-sky-50 text-sky-600",
      },
      {
        title: "Audit Trail",
        description:
          "Complete log of all changes made across the organisation",
        href: "/settings/audit-log",
        icon: ClipboardCheck,
        color: "bg-gray-100 text-gray-600",
      },
    ],
  },

  // ── GST ────────────────────────────────────────────────────────────────
  {
    category: "GST",
    description: "GST compliance and filing reports",
    tab: "gst",
    reports: [
      {
        title: "GSTR-1 (Sales)",
        description:
          "Outward supplies return with invoice-level detail for filing",
        href: "/tax/gstr1-export",
        icon: FileSpreadsheet,
        color: "bg-emerald-50 text-emerald-600",
      },
      {
        title: "GSTR-2 (Purchase)",
        description:
          "Inward supplies summary for purchase-side reconciliation",
        href: "/reports/purchase-register",
        icon: Receipt,
        color: "bg-lime-50 text-lime-600",
      },
      {
        title: "GSTR-3B",
        description:
          "Monthly summary return with tax liability and ITC details",
        href: "/tax/gstr3b",
        icon: FileText,
        color: "bg-cyan-50 text-cyan-600",
      },
      {
        title: "GST Purchase (With HSN)",
        description:
          "Purchase transactions with HSN code-wise tax breakup",
        href: "/reports/purchase-register",
        icon: Hash,
        color: "bg-orange-50 text-orange-600",
      },
      {
        title: "GST Sales (With HSN)",
        description:
          "Sales transactions with HSN code-wise tax breakup",
        href: "/reports/sales-register",
        icon: Hash,
        color: "bg-amber-50 text-amber-600",
      },
      {
        title: "HSN Wise Sales Summary",
        description:
          "Aggregated sales grouped by HSN code with tax totals",
        href: "/reports/sales-register",
        icon: ListOrdered,
        color: "bg-yellow-50 text-yellow-700",
      },
    ],
  },

  // ── Transaction ────────────────────────────────────────────────────────
  {
    category: "Transaction",
    description: "Transaction registers and expense analysis",
    tab: "transaction",
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
      {
        title: "Purchase Summary",
        description:
          "Aggregated purchase totals by vendor, item, or category",
        href: "/reports/purchase-register",
        icon: PieChart,
        color: "bg-indigo-50 text-indigo-600",
      },
      {
        title: "Expense Category Report",
        description:
          "Expenses grouped by category with totals and trends",
        href: "/expenses",
        icon: Wallet,
        color: "bg-rose-50 text-rose-600",
      },
      {
        title: "Expense Transaction Report",
        description:
          "Detailed list of all expense transactions with filters",
        href: "/expenses",
        icon: ScrollText,
        color: "bg-pink-50 text-pink-600",
      },
      {
        title: "Daybook",
        description:
          "Chronological register of all voucher entries",
        href: "/reports/day-book",
        icon: CalendarDays,
        color: "bg-fuchsia-50 text-fuchsia-600",
      },
    ],
  },

  // ── Party ──────────────────────────────────────────────────────────────
  {
    category: "Party",
    description: "Customer and vendor analysis reports",
    tab: "party",
    reports: [
      {
        title: "Receivable Aging",
        description:
          "Outstanding receivables by customer with aging buckets",
        href: "/reports/receivable-aging",
        icon: Clock,
        color: "bg-amber-50 text-amber-600",
      },
      {
        title: "Payable Aging",
        description:
          "Outstanding payables by vendor with aging buckets",
        href: "/reports/payable-aging",
        icon: CreditCard,
        color: "bg-orange-50 text-orange-600",
      },
      {
        title: "Item Report By Party",
        description:
          "Items sold or purchased broken down by party",
        href: "/reports/sales-register",
        icon: Users,
        color: "bg-blue-50 text-blue-600",
      },
      {
        title: "Item Sales and Purchase Summary",
        description:
          "Consolidated item-level sales and purchase quantities and values",
        href: "/reports/stock-summary",
        icon: ArrowLeftRight,
        color: "bg-teal-50 text-teal-600",
      },
      {
        title: "Party Statement (Ledger)",
        description:
          "Complete transaction ledger for a specific customer or vendor",
        href: "/reports/general-ledger",
        icon: BookOpen,
        color: "bg-purple-50 text-purple-600",
      },
      {
        title: "Party Report By Item",
        description:
          "Party-wise breakdown for each item sold or purchased",
        href: "/reports/sales-register",
        icon: UserCheck,
        color: "bg-green-50 text-green-600",
      },
      {
        title: "Receivable Aging Report",
        description:
          "Detailed aging schedule of receivables with days-overdue bands",
        href: "/reports/receivable-aging",
        icon: AlertTriangle,
        color: "bg-red-50 text-red-600",
      },
      {
        title: "Party Wise Outstanding",
        description:
          "Net outstanding balances for each party at a glance",
        href: "/reports/receivable-aging",
        icon: UserMinus,
        color: "bg-rose-50 text-rose-600",
      },
    ],
  },

  // ── Item / Inventory ───────────────────────────────────────────────────
  {
    category: "Item / Inventory",
    description: "Stock valuation, movement, and inventory reports",
    tab: "item",
    reports: [
      {
        title: "Low Stock Summary",
        description:
          "Items that have fallen below their reorder level",
        href: "/stock",
        icon: AlertTriangle,
        color: "bg-red-50 text-red-600",
      },
      {
        title: "Stock Summary",
        description:
          "Current inventory valuation across products and warehouses",
        href: "/reports/stock-summary",
        icon: Package,
        color: "bg-purple-50 text-purple-600",
      },
      {
        title: "Stock Detail Report",
        description:
          "Detailed stock transactions with batch and serial number info",
        href: "/reports/stock-movement",
        icon: PackageSearch,
        color: "bg-indigo-50 text-indigo-600",
      },
      {
        title: "Stock Summary - Category Wise",
        description:
          "Inventory valuation grouped by product category",
        href: "/reports/stock-summary",
        icon: Layers,
        color: "bg-violet-50 text-violet-600",
      },
      {
        title: "Stock Summary - Godown Wise",
        description:
          "Inventory levels broken down by warehouse or godown",
        href: "/reports/stock-summary",
        icon: Warehouse,
        color: "bg-slate-100 text-slate-600",
      },
      {
        title: "Stock Movement",
        description:
          "Detailed stock in/out movements with product and warehouse filters",
        href: "/reports/stock-movement",
        icon: ArrowUpDown,
        color: "bg-sky-50 text-sky-600",
      },
      {
        title: "Rate List",
        description:
          "Current selling and purchase rates for all products",
        href: "/stock/products",
        icon: Tag,
        color: "bg-emerald-50 text-emerald-600",
      },
    ],
  },

  // ── Summary ────────────────────────────────────────────────────────────
  {
    category: "Summary",
    description: "Aggregated summaries, TDS/TCS, and profitability",
    tab: "summary",
    reports: [
      {
        title: "Sales Summary",
        description:
          "Period-wise aggregated sales with totals and growth metrics",
        href: "/reports/sales-register",
        icon: BarChart3,
        color: "bg-green-50 text-green-600",
      },
      {
        title: "Bill Wise Profit",
        description:
          "Profit margin analysis for each invoice or bill",
        href: "/reports/profit-loss",
        icon: TrendingUp,
        color: "bg-emerald-50 text-emerald-600",
      },
      {
        title: "TDS Payable",
        description:
          "Tax deducted at source payable with section-wise breakdown",
        href: "/reports/tds-summary",
        icon: IndianRupee,
        color: "bg-cyan-50 text-cyan-600",
      },
      {
        title: "TDS Receivable",
        description:
          "TDS receivable entries pending credit or refund",
        href: "/reports/tds-summary",
        icon: BadgeIndianRupee,
        color: "bg-teal-50 text-teal-600",
      },
      {
        title: "TCS Payable",
        description:
          "Tax collected at source payable to the government",
        href: "/reports/tds-summary",
        icon: CircleDollarSign,
        color: "bg-blue-50 text-blue-600",
      },
      {
        title: "TCS Receivable",
        description:
          "TCS receivable entries pending adjustment or refund",
        href: "/reports/tds-summary",
        icon: CircleDollarSign,
        color: "bg-indigo-50 text-indigo-600",
      },
      {
        title: "GST Summary",
        description:
          "Output tax vs input tax with rate-wise breakdown and net liability",
        href: "/reports/gst-summary",
        icon: IndianRupee,
        color: "bg-amber-50 text-amber-600",
      },
    ],
  },
];

// Tab definitions
const tabs: Array<{ value: TabKey; label: string }> = [
  { value: "all", label: "All" },
  { value: "financial", label: "Financial" },
  { value: "gst", label: "GST" },
  { value: "transaction", label: "Transaction" },
  { value: "party", label: "Party" },
  { value: "item", label: "Item" },
  { value: "summary", label: "Summary" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsHubPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const visibleCategories = useMemo(() => {
    if (activeTab === "all") return reportCategories;
    return reportCategories.filter((c) => c.tab === activeTab);
  }, [activeTab]);

  const totalReports = useMemo(() => {
    return reportCategories.reduce(
      (sum, cat) => sum + cat.reports.length,
      0
    );
  }, []);

  const tabsWithCounts = useMemo(() => {
    return tabs.map((t) => ({
      value: t.value,
      label: t.label,
      count:
        t.value === "all"
          ? totalReports
          : reportCategories
              .filter((c) => c.tab === t.value)
              .reduce((sum, c) => sum + c.reports.length, 0),
    }));
  }, [totalReports]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate detailed financial, GST, sales, inventory, and tax reports
          </p>
        </div>
        <Link
          href="/ca"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          CA Reports Sharing
        </Link>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabsWithCounts}
        value={activeTab}
        onChange={(v) => setActiveTab(v as TabKey)}
      />

      {/* Report Categories */}
      <div className="space-y-8">
        {visibleCategories.map((category) => (
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
    </div>
  );
}
