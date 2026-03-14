"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileText,
  Calculator,
  ArrowRight,
  CalendarClock,
  IndianRupee,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import dayjs from "dayjs";

interface GstReturn {
  id: string;
  return_type: string;
  period: string;
  status: string;
  data: any;
  filed_at: string | null;
  arn: string | null;
  created_at: string;
}

const RETURN_TYPE_LABELS: Record<string, string> = {
  GSTR1: "GSTR-1",
  GSTR3B: "GSTR-3B",
  GSTR9: "GSTR-9",
  GSTR9C: "GSTR-9C",
};

const statusBadgeMap: Record<string, { variant: "default" | "warning" | "success" | "info"; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  computed: { variant: "warning", label: "Computed" },
  filed: { variant: "success", label: "Filed" },
};

// Deadlines for the current month
function getUpcomingDeadlines() {
  const now = dayjs();
  const currentMonth = now.format("MMMM YYYY");
  const prevMonth = now.subtract(1, "month").format("MMM YYYY");

  return [
    {
      type: "GSTR-1",
      description: `Outward supplies for ${prevMonth}`,
      due_date: now.date() <= 11 ? now.date(11).format("DD MMM YYYY") : now.add(1, "month").date(11).format("DD MMM YYYY"),
      is_overdue: false,
    },
    {
      type: "GSTR-3B",
      description: `Summary return for ${prevMonth}`,
      due_date: now.date() <= 20 ? now.date(20).format("DD MMM YYYY") : now.add(1, "month").date(20).format("DD MMM YYYY"),
      is_overdue: false,
    },
    {
      type: "TDS Return",
      description: `Quarterly TDS return`,
      due_date: dayjs().endOf("quarter").add(1, "month").date(7).format("DD MMM YYYY"),
      is_overdue: false,
    },
  ];
}

export default function TaxDashboardPage() {
  // Fetch recent GST returns
  const { data: returnsData, isLoading: returnsLoading } = useQuery({
    queryKey: ["gst-returns", "recent"],
    queryFn: () =>
      api.get<{ data: GstReturn[]; meta: any }>("/tax/gst/returns", {
        limit: "5",
      }),
  });

  // Compute current period GST liability (GSTR-3B)
  const currentPeriodStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const currentPeriodEnd = dayjs().endOf("month").format("YYYY-MM-DD");

  const { data: liabilityData, isLoading: liabilityLoading } = useQuery({
    queryKey: ["gst-liability", currentPeriodStart, currentPeriodEnd],
    queryFn: () =>
      api.post<any>("/tax/gst/returns/compute", {
        return_type: "GSTR3B",
        from_date: currentPeriodStart,
        to_date: currentPeriodEnd,
      }),
  });

  const deadlines = getUpcomingDeadlines();
  const returns = returnsData?.data || [];
  const liability = liabilityData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax</h1>
          <p className="text-sm text-gray-500 mt-1">
            GST returns, TDS management, and tax compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tax/tds">
            <Button variant="outline" size="sm" icon={<TrendingDown className="h-4 w-4" />}>
              TDS Entries
            </Button>
          </Link>
          <Link href="/tax/gstr3b">
            <Button variant="outline" size="sm" icon={<FileText className="h-4 w-4" />}>
              GSTR-3B
            </Button>
          </Link>
          <Link href="/tax/gstr1-export">
            <Button variant="outline" size="sm" icon={<FileText className="h-4 w-4" />}>
              GSTR-1 Export
            </Button>
          </Link>
          <Link href="/tax/gst/compute">
            <Button icon={<Calculator className="h-4 w-4" />}>Compute Return</Button>
          </Link>
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Period Liability */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Net GST Payable
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {dayjs().format("MMMM YYYY")}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-primary-800" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {liabilityLoading
              ? "..."
              : liability?.net_tax_payable
                ? formatCurrency(liability.net_tax_payable.total)
                : formatCurrency(0)}
          </p>
          {liability?.net_tax_payable && (
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span>CGST: {formatCurrency(liability.net_tax_payable.cgst)}</span>
              <span>SGST: {formatCurrency(liability.net_tax_payable.sgst)}</span>
              <span>IGST: {formatCurrency(liability.net_tax_payable.igst)}</span>
            </div>
          )}
        </Card>

        {/* Output Tax */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Output Tax</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Total tax on sales
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-danger-50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-danger-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {liabilityLoading
              ? "..."
              : liability?.outward_supplies
                ? formatCurrency(liability.outward_supplies.total_tax)
                : formatCurrency(0)}
          </p>
        </Card>

        {/* Input Tax Credit */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Input Tax Credit</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Tax on purchases
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-success-500 rotate-180" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-3">
            {liabilityLoading
              ? "..."
              : liability?.inward_supplies_itc
                ? formatCurrency(liability.inward_supplies_itc.total_tax)
                : formatCurrency(0)}
          </p>
        </Card>
      </div>

      {/* Middle Section: Deadlines + Recent Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card padding="none">
          <div className="p-6 border-b border-gray-200">
            <CardHeader className="mb-0">
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
          </div>
          <div className="divide-y divide-gray-100">
            {deadlines.map((deadline, idx) => (
              <div key={idx} className="flex items-center gap-4 px-6 py-4">
                <div className="h-10 w-10 rounded-lg bg-warning-50 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-warning-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {deadline.type}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {deadline.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-gray-900">
                    {deadline.due_date}
                  </p>
                  {deadline.is_overdue && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3 w-3 text-danger-500" />
                      <span className="text-xs text-danger-500">Overdue</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Filed Returns */}
        <Card padding="none">
          <div className="p-6 border-b border-gray-200">
            <CardHeader className="mb-0">
              <div className="flex items-center justify-between w-full">
                <CardTitle>Recent Returns</CardTitle>
                <Link href="/tax/gst">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </div>
          <div className="divide-y divide-gray-100">
            {returnsLoading ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                Loading...
              </div>
            ) : returns.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No returns found. Compute your first GST return.
              </div>
            ) : (
              returns.map((ret) => {
                const badge = statusBadgeMap[ret.status] || statusBadgeMap.draft;
                return (
                  <div key={ret.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {RETURN_TYPE_LABELS[ret.return_type] || ret.return_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Period: {ret.period}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={badge.variant} dot>
                        {badge.label}
                      </Badge>
                      {ret.filed_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Filed {formatDate(ret.filed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
