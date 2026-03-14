"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useBudgets, useBudgetSummary, type Budget } from "@/hooks/use-budgets";
import { formatCurrency } from "@/lib/utils";
import { Plus, BarChart3, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  active: { variant: "success", label: "Active" },
  closed: { variant: "info", label: "Closed" },
};

export default function BudgetsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");

  const { data, isLoading } = useBudgets({
    status: statusFilter || undefined,
    fiscal_year: fiscalYear || undefined,
  });
  const { data: summary } = useBudgetSummary();

  const budgets: Budget[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage your financial budgets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/budgets/variance">
            <Button
              variant="outline"
              size="sm"
              icon={<BarChart3 className="h-4 w-4" />}
            >
              Variance Report
            </Button>
          </Link>
          <Link href="/budgets/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Budget</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="md">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total Budgeted
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(summary.totalBudgeted)}
            </p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Actual Spending
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(summary.totalActual)}
            </p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Variance
            </p>
            <p
              className={`text-xl font-bold mt-1 ${
                summary.variance >= 0 ? "text-success-700" : "text-danger-600"
              }`}
            >
              {formatCurrency(summary.variance)}
            </p>
            <p className="text-xs text-gray-500">
              {summary.variancePercent > 0 ? "+" : ""}
              {summary.variancePercent}% of budget
            </p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Active Budgets
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {summary.activeBudgetCount}
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-48">
          <Select
            options={[
              { value: "", label: "All Statuses" },
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "closed", label: "Closed" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filter by status"
          />
        </div>
        <div className="w-48">
          <Select
            options={[
              { value: "", label: "All Periods" },
              { value: "25-26", label: "FY 2025-26" },
              { value: "24-25", label: "FY 2024-25" },
            ]}
            value={fiscalYear}
            onChange={setFiscalYear}
            placeholder="Fiscal year"
          />
        </div>
      </div>

      {/* Budget List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="md">
              <div className="h-20 bg-gray-100 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card padding="md" className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No budgets found</p>
          <Link href="/budgets/new" className="mt-4 inline-block">
            <Button size="sm">Create your first budget</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => {
            const utilized =
              budget.total_amount > 0 ? 65 : 0; // Placeholder - actual would come from variance endpoint
            const s = statusBadgeMap[budget.status] || statusBadgeMap.draft;

            return (
              <Card key={budget.id} padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {budget.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      FY {budget.fiscal_year} | {budget.period_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={s.variant} dot>
                      {s.label}
                    </Badge>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(Number(budget.total_amount))}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">Utilized</span>
                    <span
                      className={
                        utilized > 100
                          ? "text-danger-600 font-medium"
                          : utilized > 80
                          ? "text-warning-600 font-medium"
                          : "text-gray-600"
                      }
                    >
                      {utilized}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        utilized > 100
                          ? "bg-danger-500"
                          : utilized > 80
                          ? "bg-warning-500"
                          : "bg-success-500"
                      }`}
                      style={{ width: `${Math.min(utilized, 100)}%` }}
                    />
                  </div>
                </div>

                {budget.description && (
                  <p className="text-xs text-gray-500 mt-2">
                    {budget.description}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
