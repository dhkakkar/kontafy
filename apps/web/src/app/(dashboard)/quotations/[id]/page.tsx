"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  useQuotation,
  useUpdateQuotationStatus,
  useConvertQuotationToInvoice,
  useDeleteQuotation,
} from "@/hooks/use-quotations";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2,
  ArrowRight,
  Download,
  Clock,
  Edit3,
} from "lucide-react";

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  accepted: { variant: "success", label: "Accepted" },
  converted: { variant: "success", label: "Converted" },
  invoiced: { variant: "success", label: "Invoiced" },
  rejected: { variant: "danger", label: "Rejected" },
  expired: { variant: "warning", label: "Expired" },
};

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: quotation, isLoading } = useQuotation(quotationId);
  const updateStatusMutation = useUpdateQuotationStatus();
  const convertMutation = useConvertQuotationToInvoice();
  const deleteMutation = useDeleteQuotation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <Card><div className="h-60 bg-gray-100 rounded animate-pulse" /></Card>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Quotation not found</h1>
        </div>
      </div>
    );
  }

  const status = statusBadgeMap[quotation.status] || statusBadgeMap.draft;
  const isDraft = quotation.status === "draft";
  const isSent = quotation.status === "sent";
  const canConvert = !["rejected", "expired", "accepted", "converted", "invoiced"].includes(quotation.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/quotations">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {quotation.quotation_number}
            </h1>
            <Badge variant={status.variant} dot>{status.label}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Created {formatDate(quotation.created_at)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          icon={<Edit3 className="h-4 w-4" />}
          onClick={() => router.push(`/quotations/new?edit=${quotationId}`)}
        >
          Edit
        </Button>
        {isDraft && (
          <Button
            variant="outline"
            size="sm"
            icon={<Send className="h-4 w-4" />}
            onClick={() => updateStatusMutation.mutate({ id: quotationId, status: "sent" })}
            loading={updateStatusMutation.isPending}
          >
            Mark as Sent
          </Button>
        )}
        {isSent && (
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => updateStatusMutation.mutate({ id: quotationId, status: "accepted" })}
              loading={updateStatusMutation.isPending}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<XCircle className="h-4 w-4" />}
              onClick={() => updateStatusMutation.mutate({ id: quotationId, status: "rejected" })}
            >
              Reject
            </Button>
          </>
        )}
        {canConvert && (
          <Button
            size="sm"
            icon={<ArrowRight className="h-4 w-4" />}
            onClick={async () => {
              const result = await convertMutation.mutateAsync(quotationId);
              if (result?.id) {
                router.push(`/invoices/${result.id}`);
              }
            }}
            loading={convertMutation.isPending}
          >
            Convert to Invoice
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
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Customer
                </h4>
                <p className="text-sm font-semibold text-gray-900">
                  {quotation.contact?.company_name || quotation.contact?.name}
                </p>
                {quotation.contact?.gstin && (
                  <p className="text-xs text-primary-800 font-medium mt-0.5">
                    GSTIN: {quotation.contact.gstin}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDate(quotation.date)}</p>
                </div>
                {quotation.validity_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDate(quotation.validity_date)}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Line Items */}
          {quotation.items && quotation.items.length > 0 && (
            <Card padding="none">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-20">HSN</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-16">Qty</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-24">Rate</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-24">Tax</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item, idx) => {
                      const taxAmt = quotation.is_igst
                        ? toNum(item.igst_amount) + toNum(item.cess_amount)
                        : toNum(item.cgst_amount) + toNum(item.sgst_amount) + toNum(item.cess_amount);
                      return (
                        <tr key={item.id || idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-3 px-4 text-gray-900">{item.description}</td>
                          <td className="py-3 px-4 text-gray-500 text-xs font-mono">{item.hsn_code || "-"}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{toNum(item.quantity)} {item.unit}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(toNum(item.rate))}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(taxAmt)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(toNum(item.total))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Notes */}
          {(quotation.notes || quotation.terms) && (
            <Card>
              {quotation.notes && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Terms & Conditions</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{quotation.terms}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right: Amount Summary */}
        <div>
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Amount Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(toNum(quotation.subtotal))}</span>
              </div>
              {toNum(quotation.discount_amount) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-gray-500">-{formatCurrency(toNum(quotation.discount_amount))}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-700">{formatCurrency(toNum(quotation.tax_amount))}</span>
              </div>
              <div className="border-t-2 border-gray-900 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(toNum(quotation.total))}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Quotation"
        description={`Are you sure you want to delete ${quotation.quotation_number}?`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await deleteMutation.mutateAsync(quotationId);
              router.push("/quotations");
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
