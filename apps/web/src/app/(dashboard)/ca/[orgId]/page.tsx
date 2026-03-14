"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useCaClientSummary,
  useCaAnnotations,
  useCaExportData,
} from "@/hooks/use-ca-portal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  BarChart3,
  FileText,
  Receipt,
  Download,
  Loader2,
  MessageSquareText,
  Building2,
  ClipboardCheck,
} from "lucide-react";

export default function CaClientDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data, isLoading, error } = useCaClientSummary(orgId);
  const { data: recentAnnotations } = useCaAnnotations(orgId);
  const exportQuery = useCaExportData(orgId, "2025-26");

  const [fyInput, setFyInput] = useState("2025-26");

  const handleExport = () => {
    exportQuery.refetch().then((result) => {
      if (result.data) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${result.data.organization.name}-${fyInput}-data-pack.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500 text-sm">
          Failed to load client data. Please try again.
        </p>
      </Card>
    );
  }

  const { organization: org, summary } = data;

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-800" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
              <div className="flex items-center gap-3 mt-0.5">
                {org.gstin && (
                  <span className="text-xs font-mono text-gray-500">
                    GSTIN: {org.gstin}
                  </span>
                )}
                {org.pan && (
                  <span className="text-xs font-mono text-gray-500">
                    PAN: {org.pan}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="e.g. 2025-26"
            value={fyInput}
            onChange={(e) => setFyInput(e.target.value)}
            className="w-32 h-8 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            loading={exportQuery.isFetching}
          >
            Download Annual Pack
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Revenue (Month)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.revenueThisMonth)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-success-50 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-success-700" />
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Expenses (Month)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.expensesThisMonth)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-warning-50 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-warning-700" />
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Receivables</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.receivables.total)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {summary.receivables.count} invoices
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-primary-800" />
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Payables</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.payables.total)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {summary.payables.count} bills
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-danger-50 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-danger-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links + Annotations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Links */}
        <Card padding="md" className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {[
              {
                label: "Profit & Loss",
                icon: <BarChart3 className="h-5 w-5" />,
                href: `/ca/${orgId}/annotations?entityType=journal_entry`,
              },
              {
                label: "Balance Sheet",
                icon: <FileText className="h-5 w-5" />,
                href: `/ca/${orgId}/annotations?entityType=invoice`,
              },
              {
                label: "Trial Balance",
                icon: <BookOpen className="h-5 w-5" />,
                href: `/ca/${orgId}/annotations?entityType=contact`,
              },
              {
                label: "GST Returns",
                icon: <Receipt className="h-5 w-5" />,
                href: `/ca/${orgId}/annotations?entityType=journal_entry`,
              },
              {
                label: "Pending Approvals",
                icon: <ClipboardCheck className="h-5 w-5" />,
                href: `/ca/${orgId}/approvals`,
              },
            ].map((item) => (
              <Link key={item.label} href={item.href}>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group">
                  <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-800 group-hover:bg-primary-100 transition-colors shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {item.label}
                  </span>
                </button>
              </Link>
            ))}
          </div>
        </Card>

        {/* Journal Entries Info */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Journal Entries</span>
              <span className="text-lg font-semibold text-gray-900">
                {summary.journalEntriesThisMonth}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Net Position</span>
              <span
                className={`text-lg font-semibold ${
                  summary.revenueThisMonth - summary.expensesThisMonth >= 0
                    ? "text-success-700"
                    : "text-danger-700"
                }`}
              >
                {formatCurrency(
                  summary.revenueThisMonth - summary.expensesThisMonth
                )}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600">Fiscal Year Start</span>
              <Badge variant="info">
                Month {org.fiscalYearStart}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Recent Annotations */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary-800" />
              Recent Annotations
            </CardTitle>
            <Link href={`/ca/${orgId}/annotations`}>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>

          {recentAnnotations && recentAnnotations.length > 0 ? (
            <div className="space-y-3">
              {recentAnnotations.slice(0, 5).map((ann) => (
                <div
                  key={ann.id}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="default">
                      {ann.entity_type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDate(ann.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {ann.comment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-gray-400">
              No annotations yet
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
