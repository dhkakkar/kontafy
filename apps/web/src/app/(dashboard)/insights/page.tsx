"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CashFlowForecastChart } from "@/components/charts/cash-flow-forecast-chart";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useCashFlowForecast,
  useAiInsights,
  useAiAnomalies,
  useDismissInsight,
} from "@/hooks/use-ai";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  X,
  Clock,
  Eye,
  BarChart3,
  Loader2,
  RefreshCw,
  IndianRupee,
  Receipt,
  Calendar,
  Zap,
} from "lucide-react";

// ─── Skeleton Loaders ────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-[320px] flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-gray-100 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-64 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Helper: Severity Icon ───────────────────────────────────────

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "danger":
    case "high":
      return <ShieldAlert className="h-5 w-5 text-danger-500" />;
    case "warning":
    case "medium":
      return <AlertTriangle className="h-5 w-5 text-warning-500" />;
    case "success":
      return <TrendingUp className="h-5 w-5 text-success-600" />;
    default:
      return <Lightbulb className="h-5 w-5 text-primary-600" />;
  }
}

function InsightTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "collections":
      return <IndianRupee className="h-4 w-4" />;
    case "expenses":
      return <Receipt className="h-4 w-4" />;
    case "gst":
      return <Calendar className="h-4 w-4" />;
    case "overdue":
      return <Clock className="h-4 w-4" />;
    case "cash_flow":
      return <BarChart3 className="h-4 w-4" />;
    default:
      return <Zap className="h-4 w-4" />;
  }
}

// ─── Main Page ──────────────────────────────────────────────────

export default function InsightsPage() {
  const {
    data: forecast,
    isLoading: forecastLoading,
    refetch: refetchForecast,
  } = useCashFlowForecast();
  const {
    data: insights,
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = useAiInsights();
  const {
    data: anomalies,
    isLoading: anomaliesLoading,
    refetch: refetchAnomalies,
  } = useAiAnomalies();

  const dismissMutation = useDismissInsight();

  const lastUpdated = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleRefreshAll = () => {
    refetchForecast();
    refetchInsights();
    refetchAnomalies();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-800" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              AI-powered financial analysis and predictions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Last updated: {lastUpdated}
          </span>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={handleRefreshAll}
          >
            Refresh
          </Button>
          <Link href="/settings/ai">
            <Button variant="ghost" size="sm">
              AI Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <Card padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            <CardTitle>Cash Flow Forecast</CardTitle>
            <Badge variant="info">AI-Powered</Badge>
          </div>
          {forecast && (
            <span className="text-xs text-gray-400">
              Based on {forecast.historicalMonths} months of data
            </span>
          )}
        </CardHeader>

        {forecastLoading ? (
          <ChartSkeleton />
        ) : forecast && forecast.predictions.length > 0 ? (
          <>
            <CashFlowForecastChart
              data={forecast.predictions}
              confidence={forecast.confidence}
            />

            {/* Forecast Insights */}
            {forecast.insights.length > 0 && (
              <div className="mt-4 space-y-2">
                {forecast.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary-50/50 text-sm"
                  >
                    <Lightbulb className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{insight}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-sm text-gray-400">
            <BarChart3 className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p>No forecast data available yet.</p>
            <p className="mt-1">
              Forecasts require at least 3 months of payment history.
            </p>
          </div>
        )}
      </Card>

      {/* Insights + Anomalies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights Feed */}
        <Card padding="md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning-500" />
              <CardTitle>Business Insights</CardTitle>
            </div>
            <Badge variant="default" dot>
              {insightsLoading ? "..." : insights?.length ?? 0}
            </Badge>
          </CardHeader>

          {insightsLoading ? (
            <div className="space-y-3">
              <InsightSkeleton />
              <InsightSkeleton />
              <InsightSkeleton />
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight) => {
                const severityBorder =
                  insight.severity === "danger"
                    ? "border-danger-200 bg-danger-50/30"
                    : insight.severity === "warning"
                      ? "border-warning-200 bg-warning-50/30"
                      : insight.severity === "success"
                        ? "border-success-200 bg-success-50/30"
                        : "border-primary-100 bg-primary-50/30";

                return (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border ${severityBorder} transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <SeverityIcon severity={insight.severity} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {insight.title}
                          </h4>
                          <Badge
                            variant={
                              insight.severity === "danger"
                                ? "danger"
                                : insight.severity === "warning"
                                  ? "warning"
                                  : insight.severity === "success"
                                    ? "success"
                                    : "info"
                            }
                          >
                            <InsightTypeIcon type={insight.type} />
                            <span className="ml-1 capitalize">{insight.type.replace("_", " ")}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {insight.description}
                        </p>
                        {insight.actionLabel && insight.actionHref && (
                          <Link
                            href={insight.actionHref}
                            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary-700 hover:text-primary-900 transition-colors"
                          >
                            {insight.actionLabel}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              <Lightbulb className="h-6 w-6 mx-auto mb-2 text-gray-300" />
              No insights available yet
            </div>
          )}
        </Card>

        {/* Anomaly Alerts */}
        <Card padding="md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-danger-500" />
              <CardTitle>Anomaly Alerts</CardTitle>
            </div>
            <Badge
              variant={
                anomalies && anomalies.length > 0 ? "danger" : "default"
              }
              dot
            >
              {anomaliesLoading ? "..." : anomalies?.length ?? 0}
            </Badge>
          </CardHeader>

          {anomaliesLoading ? (
            <div className="space-y-3">
              <InsightSkeleton />
              <InsightSkeleton />
            </div>
          ) : anomalies && anomalies.length > 0 ? (
            <div className="space-y-3">
              {anomalies.map((anomaly) => {
                const severityStyle =
                  anomaly.severity === "high"
                    ? "border-danger-200 bg-danger-50/40"
                    : anomaly.severity === "medium"
                      ? "border-warning-200 bg-warning-50/40"
                      : "border-gray-200 bg-gray-50/40";

                const typeLabel =
                  anomaly.type === "unusual_amount"
                    ? "Unusual Amount"
                    : anomaly.type === "duplicate_invoice"
                      ? "Duplicate"
                      : anomaly.type === "missing_sequence"
                        ? "Missing Sequence"
                        : "Expense Spike";

                return (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-lg border ${severityStyle}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <SeverityIcon severity={anomaly.severity} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {anomaly.title}
                            </h4>
                            <Badge
                              variant={
                                anomaly.severity === "high"
                                  ? "danger"
                                  : anomaly.severity === "medium"
                                    ? "warning"
                                    : "default"
                              }
                            >
                              {typeLabel}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {anomaly.description}
                          </p>
                          {anomaly.amount && (
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {formatCurrency(anomaly.amount)}
                            </p>
                          )}
                          <span className="text-xs text-gray-400 mt-1 block">
                            {formatDate(anomaly.detectedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {anomaly.entityType === "invoice" &&
                          anomaly.entityId && (
                            <Link href={`/invoices/${anomaly.entityId}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        {anomaly.entityType === "payment" &&
                          anomaly.entityId && (
                            <Link href="/payments">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-success-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                No anomalies detected
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Your transactions look normal
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
