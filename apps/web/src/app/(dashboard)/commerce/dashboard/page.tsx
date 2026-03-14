"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  BarChart3,
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  ArrowLeft,
  Percent,
  Truck,
  Receipt,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  summary: {
    total_sales: number;
    total_fees: number;
    total_orders: number;
    connected_platforms: number;
  };
  platform_breakdown: {
    platform: string;
    orders: number;
    sales: number;
    fees: number;
    shipping: number;
    tax: number;
  }[];
  monthly_revenue: {
    month: string;
    [platform: string]: string | number;
  }[];
  connections: {
    platform: string;
    store_name: string | null;
    last_synced_at: string | null;
  }[];
}

const PLATFORM_LABELS: Record<string, string> = {
  amazon: "Amazon",
  flipkart: "Flipkart",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
};

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-orange-500",
  flipkart: "bg-blue-500",
  shopify: "bg-green-500",
  woocommerce: "bg-purple-500",
};

const PLATFORM_BG_COLORS: Record<string, string> = {
  amazon: "bg-orange-50",
  flipkart: "bg-blue-50",
  shopify: "bg-green-50",
  woocommerce: "bg-purple-50",
};

const PLATFORM_TEXT_COLORS: Record<string, string> = {
  amazon: "text-orange-700",
  flipkart: "text-blue-700",
  shopify: "text-green-700",
  woocommerce: "text-purple-700",
};

export default function CommerceDashboardPage() {
  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["commerce-dashboard"],
    queryFn: () => api.get("/commerce/dashboard"),
  });

  const summary = dashboard?.summary ?? {
    total_sales: 0,
    total_fees: 0,
    total_orders: 0,
    connected_platforms: 0,
  };

  const breakdown = dashboard?.platform_breakdown ?? [];
  const monthlyRevenue = dashboard?.monthly_revenue ?? [];

  // Compute pie chart percentages for sales distribution
  const totalSales = summary.total_sales || 1;
  const pieData = breakdown.map((p) => ({
    ...p,
    percentage: ((p.sales / totalSales) * 100).toFixed(1),
  }));

  // Find max monthly value for bar scaling
  const maxMonthlyValue = monthlyRevenue.reduce((max, row) => {
    const total = Object.entries(row)
      .filter(([k]) => k !== "month")
      .reduce((sum, [, v]) => sum + Number(v), 0);
    return Math.max(max, total);
  }, 1);

  const feePct = summary.total_sales > 0
    ? ((summary.total_fees / summary.total_sales) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/commerce">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              E-commerce Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sales performance across all connected platforms
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-gray-100 rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.total_sales)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(summary.total_orders)} orders
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-success-600" />
                </div>
              </div>
            </Card>

            <Card hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Platform Fees</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.total_fees)}
                  </p>
                  <p className="text-xs text-danger-500 mt-1">{feePct}% of sales</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-danger-50 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-danger-600" />
                </div>
              </div>
            </Card>

            <Card hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatNumber(summary.total_orders)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Across {summary.connected_platforms} platforms
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary-600" />
                </div>
              </div>
            </Card>

            <Card hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Net Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.total_sales - summary.total_fees)}
                  </p>
                  <p className="text-xs text-success-500 mt-1">After platform fees</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Sales by Platform + Fees Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales by Platform (visual pie representation) */}
            <Card>
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary-600" />
                  Sales by Platform
                </CardTitle>
              </CardHeader>

              {pieData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No sales data yet
                </div>
              ) : (
                <div className="space-y-4">
                  {pieData.map((p) => (
                    <div key={p.platform} className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          PLATFORM_COLORS[p.platform] ?? "bg-gray-500"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {PLATFORM_LABELS[p.platform] ?? p.platform}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatCurrency(p.sales)} ({p.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              PLATFORM_COLORS[p.platform] ?? "bg-gray-500"
                            }`}
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Fees Breakdown */}
            <Card>
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-danger-500" />
                  Platform Fees Breakdown
                </CardTitle>
              </CardHeader>

              {breakdown.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No data yet
                </div>
              ) : (
                <div className="space-y-3">
                  {breakdown.map((p) => {
                    const feePercent =
                      p.sales > 0 ? ((p.fees / p.sales) * 100).toFixed(1) : "0.0";
                    return (
                      <div
                        key={p.platform}
                        className={`rounded-lg p-3 ${
                          PLATFORM_BG_COLORS[p.platform] ?? "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-sm font-medium ${
                              PLATFORM_TEXT_COLORS[p.platform] ?? "text-gray-700"
                            }`}
                          >
                            {PLATFORM_LABELS[p.platform] ?? p.platform}
                          </span>
                          <Badge variant="default">{feePercent}%</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Fees</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(p.fees)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Shipping</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(p.shipping)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Tax</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(p.tax)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Monthly Revenue Comparison */}
          <Card>
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-600" />
                Monthly Revenue by Platform
              </CardTitle>
            </CardHeader>

            {monthlyRevenue.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No monthly data yet
              </div>
            ) : (
              <div className="space-y-3">
                {/* Legend */}
                <div className="flex items-center gap-4 mb-4">
                  {breakdown.map((p) => (
                    <div key={p.platform} className="flex items-center gap-1.5">
                      <div
                        className={`h-2.5 w-2.5 rounded-sm ${
                          PLATFORM_COLORS[p.platform] ?? "bg-gray-500"
                        }`}
                      />
                      <span className="text-xs text-gray-600">
                        {PLATFORM_LABELS[p.platform] ?? p.platform}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div className="space-y-2">
                  {monthlyRevenue.map((row) => {
                    const platforms = Object.entries(row).filter(
                      ([k]) => k !== "month"
                    );
                    const total = platforms.reduce(
                      (sum, [, v]) => sum + Number(v),
                      0
                    );
                    const barWidth = (total / maxMonthlyValue) * 100;

                    return (
                      <div key={row.month} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16 shrink-0 text-right">
                          {row.month}
                        </span>
                        <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full flex rounded-lg overflow-hidden"
                            style={{ width: `${barWidth}%` }}
                          >
                            {platforms.map(([platform, value]) => {
                              const segmentPct =
                                total > 0
                                  ? (Number(value) / total) * 100
                                  : 0;
                              return (
                                <div
                                  key={platform}
                                  className={`h-full ${
                                    PLATFORM_COLORS[platform] ?? "bg-gray-400"
                                  }`}
                                  style={{ width: `${segmentPct}%` }}
                                  title={`${PLATFORM_LABELS[platform] ?? platform}: ${formatCurrency(Number(value))}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-24 text-right">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Settlement Reconciliation Summary */}
          <Card>
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary-600" />
                Settlement Summary
              </CardTitle>
            </CardHeader>

            {breakdown.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No settlement data yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">
                        Platform
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">
                        Orders
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">
                        Gross Sales
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">
                        Fees
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">
                        Shipping
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">
                        Tax
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((p) => (
                      <tr
                        key={p.platform}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${
                                PLATFORM_COLORS[p.platform] ?? "bg-gray-400"
                              }`}
                            />
                            <span className="font-medium text-gray-900">
                              {PLATFORM_LABELS[p.platform] ?? p.platform}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {formatNumber(p.orders)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 font-medium">
                          {formatCurrency(p.sales)}
                        </td>
                        <td className="py-3 px-4 text-right text-danger-600">
                          -{formatCurrency(p.fees)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatCurrency(p.shipping)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatCurrency(p.tax)}
                        </td>
                        <td className="py-3 px-4 text-right text-success-700 font-semibold">
                          {formatCurrency(p.sales - p.fees)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="py-3 px-4 text-gray-900">Total</td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {formatNumber(summary.total_orders)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {formatCurrency(summary.total_sales)}
                      </td>
                      <td className="py-3 px-4 text-right text-danger-600">
                        -{formatCurrency(summary.total_fees)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(
                          breakdown.reduce((s, p) => s + p.shipping, 0)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(
                          breakdown.reduce((s, p) => s + p.tax, 0)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-success-700">
                        {formatCurrency(summary.total_sales - summary.total_fees)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
