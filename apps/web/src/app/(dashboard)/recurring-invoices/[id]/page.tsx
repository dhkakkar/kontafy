"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  useRecurringInvoice,
  useRecurringInvoiceHistory,
  usePauseRecurringInvoice,
  useResumeRecurringInvoice,
  useDeleteRecurringInvoice,
} from "@/hooks/use-recurring";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  Calendar,
  FileText,
  Clock,
  Mail,
} from "lucide-react";

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  paused: { variant: "warning", label: "Paused" },
  stopped: { variant: "default", label: "Stopped" },
};

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function RecurringInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recurringId = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: recurring, isLoading } = useRecurringInvoice(recurringId);
  const { data: historyData } = useRecurringInvoiceHistory(recurringId);
  const pauseMutation = usePauseRecurringInvoice();
  const resumeMutation = useResumeRecurringInvoice();
  const deleteMutation = useDeleteRecurringInvoice();

  const history = historyData?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/recurring-invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <Card><div className="h-60 bg-gray-100 rounded animate-pulse" /></Card>
      </div>
    );
  }

  if (!recurring) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/recurring-invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Recurring invoice not found
          </h1>
        </div>
      </div>
    );
  }

  const status = statusBadgeMap[recurring.status] || statusBadgeMap.active;
  const isActive = recurring.status === "active";
  const isPaused = recurring.status === "paused";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/recurring-invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {recurring.name}
            </h1>
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {frequencyLabels[recurring.frequency]} | Created{" "}
            {formatDate(recurring.created_at)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {isActive && (
          <Button
            variant="outline"
            size="sm"
            icon={<Pause className="h-4 w-4" />}
            onClick={() => pauseMutation.mutate(recurringId)}
            loading={pauseMutation.isPending}
          >
            Pause
          </Button>
        )}
        {isPaused && (
          <Button
            variant="outline"
            size="sm"
            icon={<Play className="h-4 w-4" />}
            onClick={() => resumeMutation.mutate(recurringId)}
            loading={resumeMutation.isPending}
          >
            Resume
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 className="h-4 w-4" />}
          className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {recurring.contact?.company_name || recurring.contact?.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {frequencyLabels[recurring.frequency]}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {formatDate(recurring.start_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Date
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {recurring.end_date
                    ? formatDate(recurring.end_date)
                    : "No end date"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Issue Date
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {formatDate(recurring.next_issue_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Terms
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {recurring.payment_terms_days} days
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auto Send
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {recurring.auto_send ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices Generated
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {recurring.generation_count || 0}
                </p>
              </div>
            </div>
          </Card>

          {/* Line Items */}
          {recurring.items && recurring.items.length > 0 && (
            <Card padding="none">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Line Items
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-16">
                        Qty
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-24">
                        Rate
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-24">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurring.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="py-3 px-4 text-gray-900">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {formatCurrency(Number(item.rate))}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatCurrency(Number(item.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Generated Invoice History */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-200">
              <CardHeader className="!mb-0">
                <CardTitle>Generated Invoices</CardTitle>
              </CardHeader>
            </div>
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No invoices generated yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary-800" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary-800">
                          {inv.invoice_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(inv.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(inv.total))}
                      </p>
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "success"
                            : inv.status === "overdue"
                            ? "danger"
                            : "info"
                        }
                        dot
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Invoice Amount
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(Number(recurring.subtotal))}
                </span>
              </div>
              {Number(recurring.discount_amount) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-gray-500">
                    -{formatCurrency(Number(recurring.discount_amount))}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-700">
                  {formatCurrency(Number(recurring.tax_amount))}
                </span>
              </div>
              <div className="border-t-2 border-gray-900 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">
                    Total
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(Number(recurring.total))}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Schedule
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">
                  Next: {formatDate(recurring.next_issue_date)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <RefreshCw className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">
                  {frequencyLabels[recurring.frequency]}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">
                  {recurring.payment_terms_days} days payment terms
                </span>
              </div>
              {recurring.auto_send && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">Auto-send enabled</span>
                </div>
              )}
              {recurring.last_generated_at && (
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    Last generated: {formatDate(recurring.last_generated_at)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Recurring Invoice"
        description={`Are you sure you want to delete "${recurring.name}"? This will not affect already generated invoices.`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await deleteMutation.mutateAsync(recurringId);
              router.push("/recurring-invoices");
            }}
            loading={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
