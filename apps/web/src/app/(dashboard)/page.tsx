"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useDashboardStats,
  useRevenueChart,
  useRecentTransactions,
  useOverdueInvoices,
  useAgingBreakdown,
  useAgingInvoices,
  useRevenueChartByPeriod,
} from "@/hooks/use-dashboard";
import { Modal } from "@/components/ui/modal";
import { useStoredInsights } from "@/hooks/use-ai";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Plus,
  AlertTriangle,
  Clock,
  Receipt,
  Users,
  Wallet,
  Loader2,
  Brain,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

// ─── Loading Skeleton ──────────────────────────────────────────

function KpiSkeleton() {
  return (
    <Card hover className="relative overflow-hidden animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-7 w-36 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
      </div>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="flex-1" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[320px] flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: chartData, isLoading: chartLoading } = useRevenueChart(6);
  const { data: transactions, isLoading: txnLoading } = useRecentTransactions(5);
  const { data: overdueInvoices, isLoading: overdueLoading } = useOverdueInvoices();
  const { data: aiInsights, isLoading: aiLoading } = useStoredInsights(4);

  // Aging state
  const [agingType, setAgingType] = useState<"receivable" | "payable" | null>(null);
  const [selectedBucket, setSelectedBucket] = useState("");
  const [showAgingModal, setShowAgingModal] = useState(false);
  const [receivableDropdownOpen, setReceivableDropdownOpen] = useState(false);
  const [payableDropdownOpen, setPayableDropdownOpen] = useState(false);

  const { data: receivableAging } = useAgingBreakdown("receivable");
  const { data: payableAging } = useAgingBreakdown("payable");
  const { data: agingInvoices } = useAgingInvoices(agingType ?? "receivable", selectedBucket);

  // Revenue chart period state
  const [chartPeriod, setChartPeriod] = useState("last_6_months");
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const { data: periodChartData, isLoading: periodChartLoading } = useRevenueChartByPeriod(chartPeriod);

  const activeChartData = chartPeriod === "last_6_months" ? chartData : periodChartData;
  const activeChartLoading = chartPeriod === "last_6_months" ? chartLoading : periodChartLoading;

  const periodLabels: Record<string, string> = {
    last_6_months: "Last 6 Months",
    fiscal_year: "This Fiscal Year",
    prev_fiscal_year: "Previous Fiscal Year",
    last_12_months: "Last 12 Months",
  };

  const handleBucketClick = (type: "receivable" | "payable", bucketKey: string) => {
    setAgingType(type);
    setSelectedBucket(bucketKey);
    setShowAgingModal(true);
    setReceivableDropdownOpen(false);
    setPayableDropdownOpen(false);
  };

  const currentMonth = new Date().toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Financial overview for {currentMonth}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/contacts">
            <Button variant="outline" size="sm" icon={<Users className="h-4 w-4" />}>
              <span className="hidden sm:inline">Add Contact</span>
              <span className="sm:hidden">Contact</span>
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button size="sm" icon={<Plus className="h-4 w-4" />}>
              <span className="hidden sm:inline">New Invoice</span>
              <span className="sm:hidden">Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : statsError ? (
          <Card className="col-span-full p-6 text-center text-sm text-gray-500">
            Unable to load dashboard stats. Please try again.
          </Card>
        ) : stats ? (
          <>
            {/* Revenue */}
            <Card hover className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    Revenue (This Month)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats.revenue.thisMonth)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {stats.revenue.percentChange !== 0 && (
                      <span
                        className={`flex items-center text-xs font-medium ${
                          stats.revenue.percentChange > 0
                            ? "text-success-700"
                            : "text-danger-700"
                        }`}
                      >
                        {stats.revenue.percentChange > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 mr-0.5" />
                        )}
                        {Math.abs(stats.revenue.percentChange)}%
                      </span>
                    )}
                    <span className="text-xs text-gray-400">vs last month</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-50">
                  <IndianRupee className="h-5 w-5 text-primary-800" />
                </div>
              </div>
            </Card>

            {/* Receivables */}
            <Card hover className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Receivables</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats.receivables.total)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {stats.receivables.overdueCount > 0 && (
                      <span className="flex items-center text-xs font-medium text-danger-700">
                        <AlertTriangle className="h-3.5 w-3.5 mr-0.5" />
                        {formatCurrency(stats.receivables.overdue)} overdue
                      </span>
                    )}
                    {stats.receivables.overdueCount > 0 && (
                      <span className="text-xs text-gray-400">
                        ({stats.receivables.overdueCount} invoices)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-success-50">
                    <ArrowDownLeft className="h-5 w-5 text-success-700" />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setReceivableDropdownOpen(!receivableDropdownOpen)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      Aging <ChevronDown className="h-3 w-3" />
                    </button>
                    {receivableDropdownOpen && receivableAging && (
                      <div className="absolute right-0 top-6 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        {receivableAging.map((bucket) => (
                          <button
                            key={bucket.key}
                            onClick={() => handleBucketClick("receivable", bucket.key)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span className="text-xs text-gray-700">{bucket.label}</span>
                            <span className="text-xs font-medium text-gray-900">
                              {formatCurrency(bucket.amount)} ({bucket.count})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Payables */}
            <Card hover className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Payables</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(stats.payables.total)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {stats.payables.overdueCount > 0 && (
                      <span className="flex items-center text-xs font-medium text-warning-700">
                        <Clock className="h-3.5 w-3.5 mr-0.5" />
                        {formatCurrency(stats.payables.overdue)} overdue
                      </span>
                    )}
                    {stats.payables.overdueCount > 0 && (
                      <span className="text-xs text-gray-400">
                        ({stats.payables.overdueCount} bills)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-warning-50">
                    <ArrowUpRight className="h-5 w-5 text-warning-700" />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setPayableDropdownOpen(!payableDropdownOpen)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      Aging <ChevronDown className="h-3 w-3" />
                    </button>
                    {payableDropdownOpen && payableAging && (
                      <div className="absolute right-0 top-6 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        {payableAging.map((bucket) => (
                          <button
                            key={bucket.key}
                            onClick={() => handleBucketClick("payable", bucket.key)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span className="text-xs text-gray-700">{bucket.label}</span>
                            <span className="text-xs font-medium text-gray-900">
                              {formatCurrency(bucket.amount)} ({bucket.count})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* GST Due / Cash Position */}
            <Card hover className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    {stats.gstLiability.currentPeriod > 0
                      ? "GST Due"
                      : "Cash Position"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(
                      stats.gstLiability.currentPeriod > 0
                        ? stats.gstLiability.currentPeriod
                        : stats.cashPosition.total,
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs text-gray-400">
                      {stats.gstLiability.currentPeriod > 0 && stats.gstLiability.nextDueDate
                        ? `Due ${formatDate(stats.gstLiability.nextDueDate, "DD MMM")}`
                        : "Across all bank accounts"}
                    </span>
                  </div>
                </div>
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    stats.gstLiability.currentPeriod > 0
                      ? "bg-danger-50"
                      : "bg-primary-50"
                  }`}
                >
                  {stats.gstLiability.currentPeriod > 0 ? (
                    <Receipt className="h-5 w-5 text-danger-700" />
                  ) : (
                    <Wallet className="h-5 w-5 text-primary-800" />
                  )}
                </div>
              </div>
            </Card>
          </>
        ) : null}
      </div>

      {/* Charts + Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card padding="md" className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>Revenue vs Expenses</CardTitle>
              <div className="relative">
                <button
                  onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {periodLabels[chartPeriod]} <ChevronDown className="h-3 w-3" />
                </button>
                {periodDropdownOpen && (
                  <div className="absolute left-0 top-8 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    {Object.entries(periodLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setChartPeriod(key);
                          setPeriodDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 ${
                          chartPeriod === key ? "text-primary-600 font-medium bg-primary-50" : "text-gray-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary-800" />
                <span className="text-gray-500">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent-500" />
                <span className="text-gray-500">Expenses</span>
              </div>
            </div>
          </CardHeader>
          {activeChartLoading ? (
            <ChartSkeleton />
          ) : (
            <RevenueChart data={activeChartData ?? []} />
          )}
        </Card>

        {/* Overdue Alerts */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning-500" />
              Overdue Invoices
            </CardTitle>
            <Badge variant="warning" dot>
              {overdueLoading ? "..." : (overdueInvoices?.length ?? 0)}
            </Badge>
          </CardHeader>

          {overdueLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-50 animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-100 rounded mb-2" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : overdueInvoices && overdueInvoices.length > 0 ? (
            <div className="space-y-3">
              {overdueInvoices.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/invoices/${item.id}`}
                  className="block p-3 rounded-lg bg-warning-50/50 border border-warning-500/20 hover:bg-warning-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {item.invoiceNumber}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{item.customer}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Clock className="h-3 w-3 text-danger-500" />
                    <span className="text-xs text-danger-700 font-medium">
                      {item.daysOverdue} days overdue
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              No overdue invoices
            </div>
          )}

          {overdueInvoices && overdueInvoices.length > 5 && (
            <Link href="/invoices?status=overdue">
              <Button variant="ghost" size="sm" className="w-full mt-4">
                View all overdue ({overdueInvoices.length})
              </Button>
            </Link>
          )}
        </Card>
      </div>

      {/* Recent Transactions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card padding="none" className="lg:col-span-2">
          <div className="p-6 pb-0">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <Link href="/books/journal">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardHeader>
          </div>

          {txnLoading ? (
            <TableSkeleton rows={5} />
          ) : transactions && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-6">
                        <div>
                          <p className="font-medium text-gray-900">
                            {txn.narration ||
                              txn.reference ||
                              `Entry #${txn.entryNumber}`}
                          </p>
                          {txn.referenceType && (
                            <p className="text-xs text-gray-500 capitalize">
                              {txn.referenceType}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-gray-600">
                        {formatDate(txn.date)}
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge
                          variant={
                            txn.type === "income"
                              ? "success"
                              : txn.type === "expense"
                                ? "warning"
                                : "default"
                          }
                          dot
                        >
                          {txn.type === "income"
                            ? "Income"
                            : txn.type === "expense"
                              ? "Expense"
                              : "Journal"}
                        </Badge>
                      </td>
                      <td
                        className={`py-3.5 px-6 text-right font-semibold ${
                          txn.type === "income"
                            ? "text-success-700"
                            : txn.type === "expense"
                              ? "text-gray-900"
                              : "text-gray-700"
                        }`}
                      >
                        {txn.type === "income"
                          ? "+"
                          : txn.type === "expense"
                            ? "-"
                            : ""}
                        {formatCurrency(txn.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-gray-400">
              No recent transactions
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {[
              {
                label: "Create Invoice",
                desc: "Send a new invoice to a customer",
                icon: <FileText className="h-5 w-5" />,
                href: "/invoices/new",
              },
              {
                label: "Record Payment",
                desc: "Record a received or made payment",
                icon: <IndianRupee className="h-5 w-5" />,
                href: "/payments/new",
              },
              {
                label: "Record Expense",
                desc: "Log a business expense",
                icon: <Receipt className="h-5 w-5" />,
                href: "/expenses/new",
              },
              {
                label: "Journal Entry",
                desc: "Make a manual journal entry",
                icon: <Plus className="h-5 w-5" />,
                href: "/books/journal/new",
              },
              {
                label: "Add Customer",
                desc: "Add a new customer or vendor",
                icon: <Users className="h-5 w-5" />,
                href: "/contacts",
              },
            ].map((action) => (
              <Link key={action.label} href={action.href}>
                <button className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group">
                  <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-800 group-hover:bg-primary-100 transition-colors shrink-0">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500">{action.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Insights Widget */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary-600" />
            AI Insights
          </CardTitle>
          <Link href="/insights">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>

        {aiLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-full bg-gray-100 rounded mb-1" />
                <div className="h-3 w-3/4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : aiInsights && aiInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {aiInsights.map((insight) => {
              const severityBg =
                insight.severity === "danger"
                  ? "bg-danger-50/60 border-danger-200"
                  : insight.severity === "warning"
                    ? "bg-warning-50/60 border-warning-200"
                    : insight.severity === "success"
                      ? "bg-success-50/60 border-success-200"
                      : "bg-primary-50/60 border-primary-200";

              const SIcon =
                insight.severity === "danger"
                  ? ShieldAlert
                  : insight.severity === "warning"
                    ? AlertTriangle
                    : insight.severity === "success"
                      ? TrendingUp
                      : Lightbulb;

              const iconColor =
                insight.severity === "danger"
                  ? "text-danger-500"
                  : insight.severity === "warning"
                    ? "text-warning-500"
                    : insight.severity === "success"
                      ? "text-success-600"
                      : "text-primary-600";

              return (
                <div
                  key={insight.id}
                  className={`p-3 rounded-lg border ${severityBg}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <SIcon className={`h-4 w-4 ${iconColor} shrink-0`} />
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                      {insight.title}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {insight.description}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-gray-400">
            <Brain className="h-6 w-6 mx-auto mb-2 text-gray-300" />
            <p>AI insights will appear here once data is available</p>
          </div>
        )}
      </Card>

      {/* Aging Drill-Down Modal */}
      <Modal
        open={showAgingModal}
        onClose={() => {
          setShowAgingModal(false);
          setSelectedBucket("");
          setAgingType(null);
        }}
        title={`${agingType === "receivable" ? "Receivable" : "Payable"} Aging — ${
          selectedBucket === "1_15" ? "1–15 days" :
          selectedBucket === "16_30" ? "16–30 days" :
          selectedBucket === "31_45" ? "31–45 days" :
          "Above 45 days"
        }`}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          {agingInvoices && agingInvoices.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Invoice</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Customer</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Balance Due</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {agingInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:underline font-medium">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{inv.customer}</td>
                    <td className="py-2 px-3 text-right font-medium text-gray-900">
                      {formatCurrency(inv.balanceDue)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant={inv.daysOverdue > 30 ? "danger" : "warning"} dot>
                        {inv.daysOverdue}d
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              No invoices in this aging bucket
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
