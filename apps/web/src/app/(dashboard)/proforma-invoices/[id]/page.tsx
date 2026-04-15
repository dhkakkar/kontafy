"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Printer,
  Send,
  Mail,
  MessageCircle,
  Copy,
  Trash2,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Clock,
  ArrowRightCircle,
  XCircle,
  Ban,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  meta?: any;
}

interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface QuotationItem {
  id: string;
  description: string;
  hsn_code: string | null;
  quantity: number;
  unit: string;
  rate: number;
  discount_pct: number;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  cess_rate: number;
  cess_amount: number;
  total: number;
}

interface QuotationContact {
  id: string;
  name: string;
  company_name: string | null;
  gstin: string | null;
  email: string | null;
  phone: string | null;
  billing_address: Address;
  shipping_address: Address;
}

interface QuotationOrg {
  id: string;
  name: string;
  legal_name: string | null;
  gstin: string | null;
  pan: string | null;
  address: Address;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
}

interface Quotation {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  date: string;
  due_date: string | null;
  validity_date: string | null;
  place_of_supply: string | null;
  is_igst: boolean;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  pdf_url: string | null;
  email_sent: boolean;
  whatsapp_sent: boolean;
  created_at: string;
  updated_at: string;
  items: QuotationItem[];
  contact: QuotationContact | null;
  organization: QuotationOrg;
}

// ─── Helpers ───────────────────────────────────────────────────

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  accepted: { variant: "success", label: "Accepted" },
  rejected: { variant: "danger", label: "Rejected" },
  expired: { variant: "warning", label: "Expired" },
  converted: { variant: "success", label: "Converted" },
  cancelled: { variant: "default", label: "Cancelled" },
};

function formatAddress(addr: Address | undefined | null): string {
  if (!addr) return "";
  return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ");
}

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

// ─── Component ─────────────────────────────────────────────────

export default function ProformaInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;
  const queryClient = useQueryClient();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────

  const { data: quotation, isLoading } = useQuery<Quotation>({
    queryKey: ["quotation", quotationId],
    queryFn: () =>
      api.get<ApiResponse<Quotation>>(`/quotations/${quotationId}`).then((res) => res.data),
  });

  // ─── Mutations ────────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/quotations/${quotationId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation", quotationId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/quotations/${quotationId}`),
    onSuccess: () => {
      router.push("/proforma-invoices");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () =>
      api
        .post<ApiResponse<{ id: string }>>(`/quotations/${quotationId}/duplicate`)
        .then((res) => res.data),
    onSuccess: (data: any) => {
      router.push(`/proforma-invoices/${data.id}`);
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: () =>
      api
        .post<ApiResponse<{ id: string }>>(`/quotations/${quotationId}/convert-to-invoice`)
        .then((res) => res.data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["quotation", quotationId] });
      router.push(`/invoices/${data.id}`);
    },
  });

  const downloadPdf = async () => {
    try {
      const res = await api.get<ApiResponse<{ url: string }>>(
        `/quotations/${quotationId}/pdf`
      );
      if (res.data.url) {
        window.open(res.data.url, "_blank");
      }
    } catch {
      // Fallback: direct download
      window.open(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/quotations/${quotationId}/pdf/download`,
        "_blank"
      );
    }
  };

  // ─── Loading ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/proforma-invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="h-40 bg-gray-100 rounded animate-pulse" />
            </Card>
          </div>
          <div>
            <Card>
              <div className="h-60 bg-gray-100 rounded animate-pulse" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/proforma-invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Proforma Invoice not found
          </h1>
        </div>
      </div>
    );
  }

  const status = statusBadgeMap[quotation.status] || statusBadgeMap.draft;
  const isDraft = quotation.status === "draft";
  const isCancelled = quotation.status === "cancelled";
  const isConverted = quotation.status === "converted";
  const isExpired = quotation.status === "expired";
  const isRejected = quotation.status === "rejected";
  const isAccepted = quotation.status === "accepted";
  const canEdit = isDraft || quotation.status === "sent";
  const canConvert = !isCancelled && !isConverted && !isRejected;

  // Compute tax totals from items
  const totalCgst = quotation.items.reduce((s, i) => s + toNum(i.cgst_amount), 0);
  const totalSgst = quotation.items.reduce((s, i) => s + toNum(i.sgst_amount), 0);
  const totalIgst = quotation.items.reduce((s, i) => s + toNum(i.igst_amount), 0);
  const totalCess = quotation.items.reduce((s, i) => s + toNum(i.cess_amount), 0);

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/proforma-invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {quotation.invoice_number}
            </h1>
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Proforma Invoice &middot; Created {formatDate(quotation.created_at)}
          </p>
        </div>
      </div>

      {/* ─── Actions Bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Link href={`/proforma-invoices/new?edit=${quotationId}`}>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 className="h-4 w-4" />}
            >
              Edit
            </Button>
          </Link>
        )}

        {canConvert && (
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRightCircle className="h-4 w-4" />}
            onClick={() => setShowConvertModal(true)}
            loading={convertToInvoiceMutation.isPending}
          >
            Convert to Invoice
          </Button>
        )}

        {!isCancelled && !isConverted && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              icon={<Send className="h-4 w-4" />}
              onClick={() => setShowSendMenu(!showSendMenu)}
            >
              Send
            </Button>
            {showSendMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-20 min-w-[160px]">
                <button
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                  disabled={sendingEmail}
                  onClick={async () => {
                    setShowSendMenu(false);
                    const email = quotation?.contact?.email;
                    const toEmail =
                      email || prompt("Enter customer email address:");
                    if (!toEmail) return;
                    try {
                      setSendingEmail(true);
                      await api.post("/email/send-invoice", {
                        invoiceId: quotationId,
                        toEmail,
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["quotation", quotationId],
                      });
                      alert("Proforma invoice email sent successfully!");
                    } catch (err) {
                      alert(
                        (err as Error).message || "Failed to send email"
                      );
                    } finally {
                      setSendingEmail(false);
                    }
                  }}
                >
                  <Mail className="h-4 w-4 text-gray-500" />
                  Send via Email
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50"
                  onClick={async () => {
                    setShowSendMenu(false);
                    const phone = prompt(
                      "Enter WhatsApp number (with country code, e.g. 919876543210):"
                    );
                    if (!phone) return;
                    try {
                      await api.post("/whatsapp/send-invoice", {
                        invoiceId: quotationId,
                        phoneNumber: phone,
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["quotation", quotationId],
                      });
                      alert(
                        "Proforma invoice queued for WhatsApp delivery!"
                      );
                    } catch (err) {
                      alert(
                        (err as Error).message ||
                          "Failed to send via WhatsApp"
                      );
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4 text-gray-500" />
                  Send via WhatsApp
                </button>
              </div>
            )}
          </div>
        )}

        {isDraft && (
          <Button
            variant="outline"
            size="sm"
            icon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => updateStatusMutation.mutate("sent")}
            loading={updateStatusMutation.isPending}
          >
            Mark as Sent
          </Button>
        )}

        {(quotation.status === "sent" || isDraft) && (
          <Button
            variant="outline"
            size="sm"
            icon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => updateStatusMutation.mutate("accepted")}
            loading={updateStatusMutation.isPending}
          >
            Mark as Accepted
          </Button>
        )}

        {(quotation.status === "sent" || isDraft) && (
          <Button
            variant="outline"
            size="sm"
            icon={<XCircle className="h-4 w-4" />}
            onClick={() => updateStatusMutation.mutate("rejected")}
            loading={updateStatusMutation.isPending}
          >
            Mark as Rejected
          </Button>
        )}

        <Link href={`/proforma-invoices/${quotationId}/preview`}>
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="h-4 w-4" />}
          >
            Preview
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          onClick={downloadPdf}
        >
          Download PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          icon={<Printer className="h-4 w-4" />}
          onClick={() =>
            window.open(
              `/proforma-invoices/${quotationId}/preview?print=1`,
              "_blank"
            )
          }
        >
          Print
        </Button>

        <Button
          variant="outline"
          size="sm"
          icon={<Copy className="h-4 w-4" />}
          onClick={() => duplicateMutation.mutate()}
          loading={duplicateMutation.isPending}
        >
          Duplicate
        </Button>

        {!isConverted && !isCancelled && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Ban className="h-4 w-4" />}
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            onClick={() => updateStatusMutation.mutate("cancelled")}
            loading={updateStatusMutation.isPending}
          >
            Cancel
          </Button>
        )}

        {isDraft && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete
          </Button>
        )}
      </div>

      {/* ─── Main Content ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quotation Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* From / To */}
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  From
                </h4>
                <p className="text-sm font-semibold text-gray-900">
                  {quotation.organization?.name}
                </p>
                {quotation.organization?.gstin && (
                  <p className="text-xs text-primary-800 font-medium mt-0.5">
                    GSTIN: {quotation.organization.gstin}
                  </p>
                )}
                {quotation.organization?.address && (
                  <p className="text-xs text-gray-600 mt-1">
                    {formatAddress(quotation.organization.address)}
                  </p>
                )}
                {quotation.organization?.phone && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ph: {quotation.organization.phone}
                  </p>
                )}
                {quotation.organization?.email && (
                  <p className="text-xs text-gray-500">
                    {quotation.organization.email}
                  </p>
                )}
              </div>

              {/* To */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Bill To
                </h4>
                {quotation.contact ? (
                  <>
                    <Link
                      href={`/contacts/${quotation.contact.id}`}
                      className="text-sm font-semibold text-primary-800 hover:underline"
                    >
                      {quotation.contact.company_name ||
                        quotation.contact.name}
                    </Link>
                    {quotation.contact.company_name &&
                      quotation.contact.name !==
                        quotation.contact.company_name && (
                        <p className="text-xs text-gray-700">
                          {quotation.contact.name}
                        </p>
                      )}
                    {quotation.contact.gstin && (
                      <p className="text-xs text-primary-800 font-medium mt-0.5">
                        GSTIN: {quotation.contact.gstin}
                      </p>
                    )}
                    {quotation.contact.billing_address && (
                      <p className="text-xs text-gray-600 mt-1">
                        {formatAddress(quotation.contact.billing_address)}
                      </p>
                    )}
                    {quotation.contact.phone && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ph: {quotation.contact.phone}
                      </p>
                    )}
                    {quotation.contact.email && (
                      <p className="text-xs text-gray-500">
                        {quotation.contact.email}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No contact linked</p>
                )}
              </div>
            </div>

            {/* Quotation Meta */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proforma Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {formatDate(quotation.date)}
                  </p>
                </div>
                {quotation.validity_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Until
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {formatDate(quotation.validity_date)}
                    </p>
                  </div>
                )}
                {quotation.due_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {formatDate(quotation.due_date)}
                    </p>
                  </div>
                )}
                {quotation.place_of_supply && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Place of Supply
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {quotation.place_of_supply}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supply Type
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {quotation.is_igst
                      ? "Inter-State (IGST)"
                      : "Intra-State (CGST+SGST)"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Line Items Table */}
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
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      HSN/SAC
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Qty
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Rate
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Disc%
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Taxable
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Tax
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, idx) => {
                    const taxAmt = quotation.is_igst
                      ? toNum(item.igst_amount) + toNum(item.cess_amount)
                      : toNum(item.cgst_amount) +
                        toNum(item.sgst_amount) +
                        toNum(item.cess_amount);
                    const taxRate = quotation.is_igst
                      ? toNum(item.igst_rate)
                      : toNum(item.cgst_rate) + toNum(item.sgst_rate);

                    return (
                      <tr
                        key={item.id || idx}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="py-3 px-4 text-gray-900">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs font-mono">
                          {item.hsn_code || "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {toNum(item.quantity)}{" "}
                          <span className="text-gray-400 text-xs">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {formatCurrency(toNum(item.rate))}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-500">
                          {toNum(item.discount_pct) > 0
                            ? `${toNum(item.discount_pct)}%`
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {formatCurrency(toNum(item.taxable_amount))}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {formatCurrency(taxAmt)}
                          <span className="block text-xs text-gray-400">
                            @{taxRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatCurrency(toNum(item.total))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Timeline / Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {/* Quotation created */}
              <TimelineItem
                icon={<FileText className="h-3.5 w-3.5" />}
                title="Proforma invoice created"
                date={quotation.created_at}
                color="gray"
              />
              {/* Status changes */}
              {quotation.status !== "draft" &&
                quotation.status !== "cancelled" && (
                  <TimelineItem
                    icon={<Send className="h-3.5 w-3.5" />}
                    title="Proforma invoice marked as sent"
                    date={quotation.updated_at}
                    color="blue"
                  />
                )}
              {quotation.email_sent && (
                <TimelineItem
                  icon={<Mail className="h-3.5 w-3.5" />}
                  title="Proforma invoice sent via email"
                  date={quotation.updated_at}
                  color="blue"
                />
              )}
              {quotation.whatsapp_sent && (
                <TimelineItem
                  icon={<MessageCircle className="h-3.5 w-3.5" />}
                  title="Proforma invoice sent via WhatsApp"
                  date={quotation.updated_at}
                  color="green"
                />
              )}
              {isAccepted && (
                <TimelineItem
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  title="Proforma invoice accepted by customer"
                  date={quotation.updated_at}
                  color="green"
                />
              )}
              {isRejected && (
                <TimelineItem
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  title="Proforma invoice rejected by customer"
                  date={quotation.updated_at}
                  color="red"
                />
              )}
              {isExpired && (
                <TimelineItem
                  icon={<Clock className="h-3.5 w-3.5" />}
                  title="Proforma invoice expired"
                  date={quotation.validity_date || quotation.updated_at}
                  color="red"
                />
              )}
              {isConverted && (
                <TimelineItem
                  icon={<ArrowRightCircle className="h-3.5 w-3.5" />}
                  title="Converted to invoice"
                  date={quotation.updated_at}
                  color="green"
                />
              )}
              {isCancelled && (
                <TimelineItem
                  icon={<Ban className="h-3.5 w-3.5" />}
                  title="Proforma invoice cancelled"
                  date={quotation.updated_at}
                  color="red"
                />
              )}
            </div>
          </Card>

          {/* Notes & Terms */}
          {(quotation.notes || quotation.terms) && (
            <Card>
              {quotation.notes && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Notes
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {quotation.notes}
                  </p>
                </div>
              )}
              {quotation.terms && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {quotation.terms}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column: Amount Summary */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Amount Summary
            </h3>
            <div className="space-y-2">
              <SummaryRow
                label="Subtotal"
                value={formatCurrency(toNum(quotation.subtotal))}
              />
              {toNum(quotation.discount_amount) > 0 && (
                <SummaryRow
                  label="Discount"
                  value={`- ${formatCurrency(toNum(quotation.discount_amount))}`}
                  className="text-gray-500"
                />
              )}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <SummaryRow
                  label="Taxable Amount"
                  value={formatCurrency(
                    toNum(quotation.subtotal) -
                      toNum(quotation.discount_amount)
                  )}
                />
              </div>
              {!quotation.is_igst && totalCgst > 0 && (
                <SummaryRow
                  label="CGST"
                  value={formatCurrency(totalCgst)}
                  className="text-gray-500"
                />
              )}
              {!quotation.is_igst && totalSgst > 0 && (
                <SummaryRow
                  label="SGST"
                  value={formatCurrency(totalSgst)}
                  className="text-gray-500"
                />
              )}
              {quotation.is_igst && totalIgst > 0 && (
                <SummaryRow
                  label="IGST"
                  value={formatCurrency(totalIgst)}
                  className="text-gray-500"
                />
              )}
              {totalCess > 0 && (
                <SummaryRow
                  label="Cess"
                  value={formatCurrency(totalCess)}
                  className="text-gray-500"
                />
              )}
              <div className="border-t-2 border-gray-900 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">
                    Total
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(toNum(quotation.total))}
                  </span>
                </div>
              </div>
              {isConverted && (
                <div className="bg-success-50 rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-success-700">
                      Converted to Invoice
                    </span>
                    <CheckCircle2 className="h-5 w-5 text-success-700" />
                  </div>
                </div>
              )}
              {isCancelled && (
                <div className="bg-gray-100 rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-500">
                      Cancelled
                    </span>
                    <Ban className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          {!isCancelled && !isConverted && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {canConvert && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    icon={<ArrowRightCircle className="h-4 w-4" />}
                    onClick={() => setShowConvertModal(true)}
                    loading={convertToInvoiceMutation.isPending}
                  >
                    Convert to Invoice
                  </Button>
                )}
                <Link
                  href={`/proforma-invoices/${quotationId}/preview`}
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    icon={<Eye className="h-4 w-4" />}
                  >
                    Preview Proforma Invoice
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  icon={<Download className="h-4 w-4" />}
                  onClick={downloadPdf}
                >
                  Download PDF
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ───────────────────────── */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Proforma Invoice"
        description={`Are you sure you want to delete ${quotation.invoice_number}? This action cannot be undone.`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
          >
            Delete Proforma Invoice
          </Button>
        </div>
      </Modal>

      {/* ─── Convert to Invoice Confirmation Modal ───────────── */}
      <Modal
        open={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="Convert to Invoice"
        description={`This will create a new tax invoice from ${quotation.invoice_number} and mark this proforma invoice as converted. Continue?`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setShowConvertModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowConvertModal(false);
              convertToInvoiceMutation.mutate();
            }}
            loading={convertToInvoiceMutation.isPending}
          >
            Convert to Invoice
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  date,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  date: string;
  color: "gray" | "blue" | "green" | "red";
}) {
  const colorMap = {
    gray: "bg-gray-100 text-gray-500",
    blue: "bg-primary-50 text-primary-800",
    green: "bg-success-50 text-success-700",
    red: "bg-danger-50 text-danger-600",
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${colorMap[color]}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">
          {formatDate(date, "DD MMM YYYY, h:mm A")}
        </p>
      </div>
    </div>
  );
}
