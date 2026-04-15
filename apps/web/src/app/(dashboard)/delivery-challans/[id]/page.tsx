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
  Send,
  Mail,
  CheckCircle2,
  Edit3,
  FileText,
  Truck,
  Trash2,
  Package,
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

interface ChallanItem {
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

interface ChallanContact {
  id: string;
  name: string;
  company_name: string | null;
  gstin: string | null;
  email: string | null;
  phone: string | null;
  billing_address: Address;
  shipping_address: Address;
}

interface ChallanOrg {
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

interface DeliveryChallan {
  id: string;
  challan_number: string;
  type: string;
  status: string;
  date: string;
  place_of_supply: string | null;
  is_igst: boolean;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  vehicle_number: string | null;
  transport_notes: string | null;
  notes: string | null;
  terms: string | null;
  pdf_url: string | null;
  email_sent: boolean;
  created_at: string;
  updated_at: string;
  items: ChallanItem[];
  contact: ChallanContact | null;
  organization: ChallanOrg;
}

// ─── Helpers ───────────────────────────────────────────────────

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  delivered: { variant: "success", label: "Delivered" },
  invoiced: { variant: "warning", label: "Invoiced" },
  cancelled: { variant: "danger", label: "Cancelled" },
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

export default function DeliveryChallanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challanId = params.id as string;
  const queryClient = useQueryClient();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────

  const { data: challan, isLoading } = useQuery<DeliveryChallan>({
    queryKey: ["delivery-challan", challanId],
    queryFn: () =>
      api
        .get<ApiResponse<DeliveryChallan>>(`/bill/delivery-challans/${challanId}`)
        .then((res) => res.data),
  });

  // ─── Mutations ────────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/bill/delivery-challans/${challanId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-challan", challanId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/bill/delivery-challans/${challanId}`),
    onSuccess: () => {
      router.push("/delivery-challans");
    },
  });

  const downloadPdf = async () => {
    try {
      const res = await api.get<ApiResponse<{ url: string }>>(
        `/bill/delivery-challans/${challanId}/pdf`
      );
      if (res.data.url) {
        window.open(res.data.url, "_blank");
      }
    } catch {
      window.open(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/bill/delivery-challans/${challanId}/pdf/download`,
        "_blank"
      );
    }
  };

  const sendEmail = async () => {
    const email = challan?.contact?.email;
    const toEmail = email || prompt("Enter customer email address:");
    if (!toEmail) return;
    try {
      setSendingEmail(true);
      await api.post("/email/send-delivery-challan", {
        challanId,
        toEmail,
      });
      queryClient.invalidateQueries({ queryKey: ["delivery-challan", challanId] });
      alert("Delivery challan email sent successfully!");
    } catch (err) {
      alert((err as Error).message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/delivery-challans">
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

  if (!challan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/delivery-challans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Delivery Challan not found
          </h1>
        </div>
      </div>
    );
  }

  const status = statusBadgeMap[challan.status] || statusBadgeMap.draft;
  const isDraft = challan.status === "draft";
  const isSent = challan.status === "sent";
  const isCancelled = challan.status === "cancelled";
  const isInvoiced = challan.status === "invoiced";
  const isDelivered = challan.status === "delivered";
  const isEditable = isDraft;

  // Compute tax totals from items
  const totalCgst = challan.items.reduce((s, i) => s + toNum(i.cgst_amount), 0);
  const totalSgst = challan.items.reduce((s, i) => s + toNum(i.sgst_amount), 0);
  const totalIgst = challan.items.reduce((s, i) => s + toNum(i.igst_amount), 0);
  const totalCess = challan.items.reduce((s, i) => s + toNum(i.cess_amount), 0);

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/delivery-challans">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {challan.challan_number}
            </h1>
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Delivery Challan &middot; Created {formatDate(challan.created_at)}
          </p>
        </div>
      </div>

      {/* ─── Actions Bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {isEditable && (
          <Link href={`/delivery-challans/new?edit=${challanId}`}>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 className="h-4 w-4" />}
            >
              Edit
            </Button>
          </Link>
        )}

        {!isCancelled && !isInvoiced && (
          <Button
            variant="outline"
            size="sm"
            icon={<Send className="h-4 w-4" />}
            onClick={sendEmail}
            loading={sendingEmail}
          >
            Send
          </Button>
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

        {isSent && (
          <Button
            variant="outline"
            size="sm"
            icon={<Package className="h-4 w-4" />}
            onClick={() => updateStatusMutation.mutate("delivered")}
            loading={updateStatusMutation.isPending}
          >
            Mark as Delivered
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          onClick={downloadPdf}
        >
          Download PDF
        </Button>

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
        {/* Left Column: Challan Details */}
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
                  {challan.organization?.name}
                </p>
                {challan.organization?.gstin && (
                  <p className="text-xs text-primary-800 font-medium mt-0.5">
                    GSTIN: {challan.organization.gstin}
                  </p>
                )}
                {challan.organization?.address && (
                  <p className="text-xs text-gray-600 mt-1">
                    {formatAddress(challan.organization.address)}
                  </p>
                )}
                {challan.organization?.phone && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ph: {challan.organization.phone}
                  </p>
                )}
                {challan.organization?.email && (
                  <p className="text-xs text-gray-500">
                    {challan.organization.email}
                  </p>
                )}
              </div>

              {/* To */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Deliver To
                </h4>
                {challan.contact ? (
                  <>
                    <Link
                      href={`/contacts/${challan.contact.id}`}
                      className="text-sm font-semibold text-primary-800 hover:underline"
                    >
                      {challan.contact.company_name || challan.contact.name}
                    </Link>
                    {challan.contact.company_name &&
                      challan.contact.name !== challan.contact.company_name && (
                        <p className="text-xs text-gray-700">
                          {challan.contact.name}
                        </p>
                      )}
                    {challan.contact.gstin && (
                      <p className="text-xs text-primary-800 font-medium mt-0.5">
                        GSTIN: {challan.contact.gstin}
                      </p>
                    )}
                    {challan.contact.shipping_address && (
                      <p className="text-xs text-gray-600 mt-1">
                        {formatAddress(challan.contact.shipping_address)}
                      </p>
                    )}
                    {challan.contact.phone && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ph: {challan.contact.phone}
                      </p>
                    )}
                    {challan.contact.email && (
                      <p className="text-xs text-gray-500">
                        {challan.contact.email}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No contact linked</p>
                )}
              </div>
            </div>

            {/* Challan Meta */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Challan Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {formatDate(challan.date)}
                  </p>
                </div>
                {challan.place_of_supply && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Place of Supply
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {challan.place_of_supply}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supply Type
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {challan.is_igst ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}
                  </p>
                </div>
                {challan.vehicle_number && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Number
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {challan.vehicle_number}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Transport Notes */}
            {challan.transport_notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Transport Notes
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {challan.transport_notes}
                </p>
              </div>
            )}
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
                  {challan.items.map((item, idx) => {
                    const taxAmt = challan.is_igst
                      ? toNum(item.igst_amount) + toNum(item.cess_amount)
                      : toNum(item.cgst_amount) +
                        toNum(item.sgst_amount) +
                        toNum(item.cess_amount);
                    const taxRate = challan.is_igst
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
              <TimelineItem
                icon={<FileText className="h-3.5 w-3.5" />}
                title="Delivery challan created"
                date={challan.created_at}
                color="gray"
              />
              {(isSent || isDelivered || isInvoiced) && (
                <TimelineItem
                  icon={<Send className="h-3.5 w-3.5" />}
                  title="Challan marked as sent"
                  date={challan.updated_at}
                  color="blue"
                />
              )}
              {challan.email_sent && (
                <TimelineItem
                  icon={<Mail className="h-3.5 w-3.5" />}
                  title="Challan sent via email"
                  date={challan.updated_at}
                  color="blue"
                />
              )}
              {(isDelivered || isInvoiced) && (
                <TimelineItem
                  icon={<Package className="h-3.5 w-3.5" />}
                  title="Goods delivered"
                  date={challan.updated_at}
                  color="green"
                />
              )}
              {isInvoiced && (
                <TimelineItem
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  title="Challan converted to invoice"
                  date={challan.updated_at}
                  color="green"
                />
              )}
              {isCancelled && (
                <TimelineItem
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  title="Challan cancelled"
                  date={challan.updated_at}
                  color="red"
                />
              )}
            </div>
          </Card>

          {/* Notes & Terms */}
          {(challan.notes || challan.terms) && (
            <Card>
              {challan.notes && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Notes
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {challan.notes}
                  </p>
                </div>
              )}
              {challan.terms && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Terms & Conditions
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {challan.terms}
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
                value={formatCurrency(toNum(challan.subtotal))}
              />
              {toNum(challan.discount_amount) > 0 && (
                <SummaryRow
                  label="Discount"
                  value={`- ${formatCurrency(toNum(challan.discount_amount))}`}
                  className="text-gray-500"
                />
              )}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <SummaryRow
                  label="Taxable Amount"
                  value={formatCurrency(
                    toNum(challan.subtotal) - toNum(challan.discount_amount)
                  )}
                />
              </div>
              {!challan.is_igst && totalCgst > 0 && (
                <SummaryRow
                  label="CGST"
                  value={formatCurrency(totalCgst)}
                  className="text-gray-500"
                />
              )}
              {!challan.is_igst && totalSgst > 0 && (
                <SummaryRow
                  label="SGST"
                  value={formatCurrency(totalSgst)}
                  className="text-gray-500"
                />
              )}
              {challan.is_igst && totalIgst > 0 && (
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
                    {formatCurrency(toNum(challan.total))}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Transport Details */}
          {(challan.vehicle_number || challan.transport_notes) && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Transport Details
              </h3>
              <div className="space-y-3">
                {challan.vehicle_number && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-primary-800" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Number</p>
                      <p className="text-sm font-medium text-gray-900">
                        {challan.vehicle_number}
                      </p>
                    </div>
                  </div>
                )}
                {challan.transport_notes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Transport Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {challan.transport_notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          {!isCancelled && !isInvoiced && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  icon={<Download className="h-4 w-4" />}
                  onClick={downloadPdf}
                >
                  Download PDF
                </Button>
                {isDraft && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => updateStatusMutation.mutate("sent")}
                    loading={updateStatusMutation.isPending}
                  >
                    Mark as Sent
                  </Button>
                )}
                {isSent && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    icon={<Package className="h-4 w-4" />}
                    onClick={() => updateStatusMutation.mutate("delivered")}
                    loading={updateStatusMutation.isPending}
                  >
                    Mark as Delivered
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ───────────────────────── */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Delivery Challan"
        description={`Are you sure you want to delete ${challan.challan_number}? This action cannot be undone.`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
          >
            Delete Challan
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
        <p className="text-xs text-gray-500">{formatDate(date, "DD MMM YYYY, h:mm A")}</p>
      </div>
    </div>
  );
}
