"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Printer,
  Loader2,
  FileText,
  Pencil,
  CheckCircle2,
  Wallet,
  CreditCard,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface ApiResponse<T> {
  data: T;
}

interface PurchaseItem {
  id: string;
  description: string;
  hsn_code: string | null;
  quantity: number;
  unit: string | null;
  rate: number;
  discount_pct: number;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total: number;
  product_id: string | null;
}

interface Address {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

interface Contact {
  id: string;
  name: string;
  company_name: string | null;
  gstin: string | null;
  email: string | null;
  phone: string | null;
  billing_address?: Address | null;
}

interface Purchase {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  date: string;
  due_date: string | null;
  place_of_supply: string | null;
  is_igst: boolean;
  vendor_invoice_number: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  contact: Contact | null;
  items: PurchaseItem[];
  created_at: string;
}

interface OrgMeta {
  id: string;
  name: string;
  legal_name?: string | null;
  gstin?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: Address | null;
}

const STATE_NAME_BY_ABBR: Record<string, string> = {
  JK: "Jammu & Kashmir", HP: "Himachal Pradesh", PB: "Punjab",
  CH: "Chandigarh", UK: "Uttarakhand", HR: "Haryana",
  DL: "Delhi", RJ: "Rajasthan", UP: "Uttar Pradesh",
  BR: "Bihar", SK: "Sikkim", AR: "Arunachal Pradesh",
  NL: "Nagaland", MN: "Manipur", MZ: "Mizoram",
  TR: "Tripura", ML: "Meghalaya", AS: "Assam",
  WB: "West Bengal", JH: "Jharkhand", OD: "Odisha",
  CT: "Chhattisgarh", MP: "Madhya Pradesh", GJ: "Gujarat",
  DN: "Dadra & Nagar Haveli and Daman & Diu", MH: "Maharashtra",
  AP: "Andhra Pradesh", KA: "Karnataka", GA: "Goa",
  LD: "Lakshadweep", KL: "Kerala", TN: "Tamil Nadu",
  PY: "Puducherry", AN: "Andaman & Nicobar", TG: "Telangana",
  LA: "Ladakh",
};

function formatAddress(addr: Address | undefined | null): string {
  if (!addr) return "";
  return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ");
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "info" | "success" | "warning" | "danger" }
> = {
  draft: { label: "Draft", variant: "default" },
  sent: { label: "Approved", variant: "info" },
  overdue: { label: "Overdue", variant: "danger" },
  paid: { label: "Paid", variant: "success" },
  partially_paid: { label: "Partially Paid", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "default" },
};

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [pdfLoading, setPdfLoading] = React.useState(false);

  const { data: purchase, isLoading, error } = useQuery<Purchase>({
    queryKey: ["purchase", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Purchase>>(
        `/bill/purchases/${id}`,
      );
      return res.data;
    },
  });

  // Org details for the Bill-To card. Same source as the rest of
  // the app uses; cached 5 minutes since it rarely changes.
  const { data: org } = useQuery<OrgMeta>({
    queryKey: ["settings", "organization-meta"],
    queryFn: async () => {
      const res = await api.get<{ data: OrgMeta }>("/settings/organization");
      return (res as any)?.data || (res as any);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Approve = move status from draft → sent. Uses the dedicated
  // /status endpoint (mirror of sales). Backend validates the
  // transition table and triggers a journal-reversal on cancel.
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/bill/purchases/${id}/status`, { status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase", id] }),
        queryClient.invalidateQueries({ queryKey: ["purchases"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  const handleExport = () => {
    if (!purchase) return;
    const rows = [["Item", "HSN/SAC", "Qty", "Rate", "Disc %", "Tax", "Amount"]];
    (purchase.items || []).forEach((item) => {
      rows.push([
        item.description,
        item.hsn_code || "",
        String(item.quantity),
        String(toNum(item.rate)),
        String(toNum(item.discount_pct)),
        String(
          toNum(item.cgst_amount) +
            toNum(item.sgst_amount) +
            toNum(item.igst_amount),
        ),
        String(toNum(item.total)),
      ]);
    });
    rows.push(["", "", "", "", "", "Subtotal", String(toNum(purchase.subtotal))]);
    rows.push(["", "", "", "", "", "Tax", String(toNum(purchase.tax_amount))]);
    rows.push(["", "", "", "", "", "Total", String(toNum(purchase.total))]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-${purchase.invoice_number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const handleDownloadPdf = () => {
    if (!purchase || pdfLoading) return;
    setPdfLoading(true);
    try {
      window.open(
        `${API_BASE}/bill/purchases/${purchase.id}/pdf/download`,
        "_blank",
      );
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Purchase Bill not found
          </h1>
        </div>
        <Card>
          <div className="py-12 text-center text-gray-500">
            The purchase bill you are looking for does not exist.
          </div>
        </Card>
      </div>
    );
  }

  const status = statusConfig[purchase.status] || statusConfig.draft;
  const items = purchase.items || [];
  const isEditable = !["paid", "cancelled"].includes(purchase.status);

  // Aggregate per-bucket tax for the Amount Summary sidebar — mirror
  // of /invoices/[id]'s right-rail.
  const totals = items.reduce(
    (acc, it) => ({
      taxable: acc.taxable + toNum(it.taxable_amount),
      cgst: acc.cgst + toNum(it.cgst_amount),
      sgst: acc.sgst + toNum(it.sgst_amount),
      igst: acc.igst + toNum(it.igst_amount),
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
  );

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-11 w-11 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {purchase.invoice_number}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Created {formatDate(purchase.created_at)}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2">
          {isEditable && (
            <Link href={`/purchases/new?edit=${purchase.id}`}>
              <Button
                variant="outline"
                size="sm"
                icon={<Pencil className="h-4 w-4" />}
              >
                Edit
              </Button>
            </Link>
          )}
          {purchase.status === "draft" && (
            <Button
              size="sm"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => updateStatusMutation.mutate("sent")}
              loading={updateStatusMutation.isPending}
            >
              Mark as Approved
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="h-4 w-4" />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="h-4 w-4" />}
            onClick={handleDownloadPdf}
            loading={pdfLoading}
          >
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* ─── Main Content ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bill Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* From (Vendor) / Bill To (Org) */}
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FROM — vendor */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  From (Vendor)
                </h4>
                {purchase.contact ? (
                  <>
                    <Link
                      href={`/contacts/${purchase.contact.id}`}
                      className="text-sm font-semibold text-primary-800 hover:underline"
                    >
                      {purchase.contact.company_name || purchase.contact.name}
                    </Link>
                    {purchase.contact.company_name &&
                      purchase.contact.name !== purchase.contact.company_name && (
                        <p className="text-xs text-gray-700">
                          {purchase.contact.name}
                        </p>
                      )}
                    {purchase.contact.gstin && (
                      <p className="text-xs text-primary-800 font-medium mt-0.5">
                        GSTIN: {purchase.contact.gstin}
                      </p>
                    )}
                    {purchase.contact.billing_address && (
                      <p className="text-xs text-gray-600 mt-1">
                        {formatAddress(purchase.contact.billing_address)}
                      </p>
                    )}
                    {purchase.contact.phone && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ph: {purchase.contact.phone}
                      </p>
                    )}
                    {purchase.contact.email && (
                      <p className="text-xs text-gray-500">
                        {purchase.contact.email}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No vendor linked</p>
                )}
              </div>

              {/* BILL TO — your org (recipient of the bill) */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Bill To
                </h4>
                {org ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900">
                      {org.legal_name || org.name}
                    </p>
                    {org.gstin && (
                      <p className="text-xs text-primary-800 font-medium mt-0.5">
                        GSTIN: {org.gstin}
                      </p>
                    )}
                    {org.address && (
                      <p className="text-xs text-gray-600 mt-1">
                        {formatAddress(org.address)}
                      </p>
                    )}
                    {org.phone && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ph: {org.phone}
                      </p>
                    )}
                    {org.email && (
                      <p className="text-xs text-gray-500">{org.email}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Loading…</p>
                )}
              </div>
            </div>

            {/* Bill Meta — horizontal pills */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Date
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {formatDate(purchase.date)}
                  </p>
                </div>
                {purchase.due_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {formatDate(purchase.due_date)}
                    </p>
                  </div>
                )}
                {purchase.place_of_supply && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Place of Supply
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {STATE_NAME_BY_ABBR[purchase.place_of_supply.toUpperCase()] ||
                        purchase.place_of_supply}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supply Type
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {purchase.is_igst
                      ? "Inter-State (IGST)"
                      : "Intra-State (CGST+SGST)"}
                  </p>
                </div>
              </div>
              {purchase.vendor_invoice_number && (
                <div className="mt-4 text-xs">
                  <span className="text-gray-500">Vendor Invoice No: </span>
                  <span className="font-medium text-gray-900">
                    {purchase.vendor_invoice_number}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Line Items */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      HSN/SAC
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Qty
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Rate
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Disc %
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Taxable
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Tax
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const igstAmt = toNum(item.igst_amount);
                    const igstRate = toNum(item.igst_rate);
                    const cgstAmt = toNum(item.cgst_amount);
                    const cgstRate = toNum(item.cgst_rate);
                    const sgstAmt = toNum(item.sgst_amount);
                    const sgstRate = toNum(item.sgst_rate);
                    const isLineIgst = igstAmt > 0 || igstRate > 0;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="py-3 px-4 text-gray-900">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {item.hsn_code || "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          <div>{item.quantity}</div>
                          {item.unit && (
                            <div className="text-xs text-gray-400">{item.unit}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {formatCurrency(toNum(item.rate))}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-500">
                          {toNum(item.discount_pct) > 0
                            ? `${item.discount_pct}%`
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {formatCurrency(toNum(item.taxable_amount))}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {isLineIgst ? (
                            <>
                              <div>{formatCurrency(igstAmt)}</div>
                              <div className="text-xs text-gray-400">
                                IGST @{igstRate}%
                              </div>
                            </>
                          ) : (
                            <>
                              <div>{formatCurrency(cgstAmt + sgstAmt)}</div>
                              <div className="text-xs text-gray-400">
                                CGST @{cgstRate}% + SGST @{sgstRate}%
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatCurrency(toNum(item.total))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Payments</CardTitle>
                {purchase.status !== "paid" && purchase.status !== "cancelled" && (
                  <Link href={`/payments/new?bill_id=${purchase.id}&type=made`}>
                    <Button
                      size="sm"
                      icon={<CreditCard className="h-4 w-4" />}
                    >
                      Record Payment
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <p className="text-sm text-gray-400">
              {toNum(purchase.amount_paid) > 0
                ? `${formatCurrency(toNum(purchase.amount_paid))} paid against this bill.`
                : "No payments recorded yet."}
            </p>
          </Card>

          {/* Notes & Terms */}
          {(purchase.notes || purchase.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {purchase.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {purchase.notes}
                  </p>
                </Card>
              )}
              {purchase.terms && (
                <Card>
                  <CardHeader>
                    <CardTitle>Terms & Conditions</CardTitle>
                  </CardHeader>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {purchase.terms}
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Right: Amount Summary + Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Amount Summary</CardTitle>
            </CardHeader>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(toNum(purchase.subtotal))}
                </span>
              </div>
              {toNum(purchase.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-danger-600">
                    -{formatCurrency(toNum(purchase.discount_amount))}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Taxable Amount</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(totals.taxable)}
                </span>
              </div>
              {purchase.is_igst ? (
                totals.igst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">IGST (input credit)</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(totals.igst)}
                    </span>
                  </div>
                )
              ) : (
                <>
                  {totals.cgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">CGST (input credit)</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(totals.cgst)}
                      </span>
                    </div>
                  )}
                  {totals.sgst > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">SGST (input credit)</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(totals.sgst)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2.5">
                <span className="text-base font-semibold text-gray-900">Bill Total</span>
                <span className="text-base font-bold text-gray-900">
                  {formatCurrency(toNum(purchase.total))}
                </span>
              </div>
              {toNum(purchase.amount_paid) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="text-success-700">
                    -{formatCurrency(toNum(purchase.amount_paid))}
                  </span>
                </div>
              )}
              <div className="flex justify-between bg-primary-50 -mx-4 px-4 py-2.5 mt-2 rounded">
                <span className="font-semibold text-primary-900">Balance Due</span>
                <span className="font-bold text-primary-900">
                  {formatCurrency(toNum(purchase.balance_due))}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {purchase.status !== "paid" && purchase.status !== "cancelled" && (
                <Link href={`/payments/new?bill_id=${purchase.id}&type=made`}>
                  <Button
                    variant="primary"
                    className="w-full justify-start"
                    icon={<Wallet className="h-4 w-4" />}
                  >
                    Record Payment
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
                icon={<FileText className="h-4 w-4" />}
                onClick={handleDownloadPdf}
                loading={pdfLoading}
              >
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                icon={<Printer className="h-4 w-4" />}
                onClick={handlePrint}
              >
                Print
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
