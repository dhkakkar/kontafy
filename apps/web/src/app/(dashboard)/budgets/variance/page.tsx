"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBudgetVariance } from "@/hooks/use-budgets";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const statusColors: Record<string, string> = {
  on_track: "text-success-700",
  warning: "text-warning-600",
  over_budget: "text-danger-600",
};

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger"; label: string }
> = {
  on_track: { variant: "success", label: "On Track" },
  warning: { variant: "warning", label: "Warning" },
  over_budget: { variant: "danger", label: "Over Budget" },
};

export default function VarianceReportPage() {
  const { data, isLoading } = useBudgetVariance();

  const varianceData = Array.isArray(data?.data) ? data.data : [];
  const totals = data?.totals ?? null;

  // Chart data
  const chartData = varianceData.map((row) => ({
    name:
      row.account.name.length > 15
        ? row.account.name.slice(0, 15) + "..."
        : row.account.name,
    Budgeted: row.budgeted,
    Actual: row.actual,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/budgets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Budget Variance Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Compare budgeted amounts against actual spending
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="md">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total Budgeted
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(totals.budgeted)}
            </p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total Actual
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(totals.actual)}
            </p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Variance
            </p>
            <p
              className={`text-xl font-bold mt-1 ${
                totals.variance >= 0 ? "text-success-700" : "text-danger-600"
              }`}
            >
              {formatCurrency(totals.variance)}
            </p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Utilization
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {totals.utilized}%
            </p>
          </Card>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Budget vs Actual by Account</CardTitle>
          </CardHeader>
          <div className="h-[350px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  angle={-30}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v) =>
                    v >= 100000
                      ? `${(v / 100000).toFixed(1)}L`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}K`
                      : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="Budgeted"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="Actual"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Detailed Table */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Variance Details
          </h3>
        </div>

        {isLoading ? (
          <div className="p-8">
            <div className="h-40 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : varianceData.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No active budgets to show variance data. Create and activate a
            budget first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budgeted
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilized
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {varianceData.map((row) => {
                  const badge = statusBadgeMap[row.status] || statusBadgeMap.on_track;
                  return (
                    <tr
                      key={row.accountId}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {row.account.name}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {row.account.code}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {formatCurrency(row.budgeted)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {formatCurrency(row.actual)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium ${
                          row.variance >= 0
                            ? "text-success-700"
                            : "text-danger-600"
                        }`}
                      >
                        {formatCurrency(row.variance)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.utilized > 100
                                  ? "bg-danger-500"
                                  : row.utilized > 80
                                  ? "bg-warning-500"
                                  : "bg-success-500"
                              }`}
                              style={{
                                width: `${Math.min(row.utilized, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-12 text-right">
                            {row.utilized}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={badge.variant} dot>
                          {badge.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      Total
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(totals.budgeted)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(totals.actual)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        totals.variance >= 0
                          ? "text-success-700"
                          : "text-danger-600"
                      }`}
                    >
                      {formatCurrency(totals.variance)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {totals.utilized}%
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
