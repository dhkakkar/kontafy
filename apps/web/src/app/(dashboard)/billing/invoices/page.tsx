"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBillingInvoices } from "@/hooks/use-subscription";
import {
  ArrowLeft,
  Download,
  FileText,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusVariants: Record<string, "success" | "warning" | "danger" | "default"> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "default",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BillingInvoicesPage() {
  const { data: invoices, isLoading } = useBillingInvoices();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your past invoices and payment receipts
          </p>
        </div>
      </div>

      {/* Invoice Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No billing history
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Your payment invoices will appear here once you subscribe to a paid
              plan.
            </p>
            <Link href="/billing/plans" className="inline-block mt-4">
              <Button variant="secondary">View Plans</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-500 bg-gray-50">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500 bg-gray-50">
                    Invoice ID
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500 bg-gray-50">
                    Plan
                  </th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500 bg-gray-50">
                    Amount
                  </th>
                  <th className="text-center px-6 py-3 font-medium text-gray-500 bg-gray-50">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500 bg-gray-50">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-700">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500 font-mono text-xs">
                        {invoice.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {invoice.planName}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatAmount(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant={statusVariants[invoice.status] || "default"}
                      >
                        {invoice.status.charAt(0).toUpperCase() +
                          invoice.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {invoice.receiptUrl ? (
                        <a
                          href={invoice.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-700 hover:text-primary-900 text-sm"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
