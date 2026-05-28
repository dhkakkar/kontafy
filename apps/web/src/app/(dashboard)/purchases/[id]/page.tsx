"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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

interface Contact {
  id: string;
  name: string;
  company_name: string | null;
  gstin: string | null;
  email: string | null;
  phone: string | null;
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

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "info" | "success" | "warning" | "danger" }
> = {
  draft: { label: "Draft", variant: "default" },
  sent: { label: "Pending", variant: "info" },
  overdue: { label: "Overdue", variant: "danger" },
  paid: { label: "Paid", variant: "success" },
  partially_paid: { label: "Partially Paid", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "default" },
};

export default function PurchaseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: purchase, isLoading, error } = useQuery<Purchase>({
    queryKey: ["purchase", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Purchase>>(
        `/bill/purchases/${id}`
      );
      return res.data;
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
            toNum(item.igst_amount)
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

  const [pdfLoading, setPdfLoading] = React.useState(false);
  const handleDownloadPdf = async () => {
    if (!purchase || pdfLoading) return;
    setPdfLoading(true);
    try {
      // Open the direct-download endpoint in a new tab so the browser
      // handles the Content-Disposition save dialog. Mirrors the
      // sales-invoice flow exactly — same PdfService methods on the
      // backend, just a different controller route.
      window.open(
        `${API_BASE}/bill/purchases/${purchase.id}/pdf/download`,
        "_blank",
      );
    } finally {
      setPdfLoading(false);
    }
  };

  // Editing is meaningful for draft / not-yet-posted bills. Once a
  // bill is paid or partially paid we still allow edit (with a
  // backend-enforced restriction list), but flag it visually.
  const isEditable = !["paid", "cancelled"].includes(
    purchase?.status || "",
  );

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
            Purchase Invoice not found
          </h1>
        </div>
        <Card>
          <div className="py-12 text-center text-gray-500">
            The purchase invoice you are looking for does not exist.
          </div>
        </Card>
      </div>
    );
  }

  const status = statusConfig[purchase.status] || statusConfig.draft;
  const items = purchase.items || [];

  return (
    <div className="space-y-6">
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
              Purchase Invoice &middot; {formatDate(purchase.date)}
            </p>
          </div>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          {purchase.contact ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                {purchase.contact.name}
              </p>
              {purchase.contact.company_name && (
                <p className="text-gray-500">
                  {purchase.contact.company_name}
                </p>
              )}
              {purchase.contact.gstin && (
                <p className="text-gray-500">
                  GSTIN: {purchase.contact.gstin}
                </p>
              )}
              {purchase.contact.email && (
                <p className="text-gray-500">{purchase.contact.email}</p>
              )}
              {purchase.contact.phone && (
                <p className="text-gray-500">{purchase.contact.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No vendor info</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bill Number</span>
              <span className="font-medium text-gray-900">
                {purchase.invoice_number}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">
                {formatDate(purchase.date)}
              </span>
            </div>
            {purchase.due_date && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Due Date</span>
                <span className="font-medium text-gray-900">
                  {formatDate(purchase.due_date)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            {purchase.place_of_supply && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Place of Supply</span>
                <span className="font-medium text-gray-900">
                  {purchase.place_of_supply}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Supply Type</span>
              <Badge variant={purchase.is_igst ? "info" : "success"}>
                {purchase.is_igst
                  ? "Inter-State (IGST input credit)"
                  : "Intra-State (CGST + SGST input credit)"}
              </Badge>
            </div>
            {purchase.vendor_invoice_number && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vendor Inv. No.</span>
                <span className="font-medium text-gray-900">
                  {purchase.vendor_invoice_number}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(toNum(purchase.amount_paid))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Balance Due</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(toNum(purchase.balance_due))}
              </span>
            </div>
          </div>
        </Card>
      </div>

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
                  Tax
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Amount
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
                // Mirror /invoices/[id]: per-line tax cell shows the
                // bucket that's actually populated. Some legacy rows
                // may have both filled — the order checks IGST first
                // because inter-state items zero out CGST/SGST on
                // create, and falling through to CGST+SGST keeps
                // pre-fix rows rendering.
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
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(toNum(item.rate))}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">
                      {toNum(item.discount_pct) > 0
                        ? `${item.discount_pct}%`
                        : "-"}
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

        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">
                  {formatCurrency(toNum(purchase.subtotal))}
                </span>
              </div>
              {toNum(purchase.discount_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-danger-600">
                    -{formatCurrency(toNum(purchase.discount_amount))}
                  </span>
                </div>
              )}
              {(() => {
                // Aggregate per-bucket totals from items so the
                // summary shows what's actually on the bill rather
                // than the legacy "Tax" lumpsum. Inter-state bills
                // collapse to a single IGST line; intra-state shows
                // CGST + SGST as two lines.
                const cgst = items.reduce((s, it) => s + toNum(it.cgst_amount), 0);
                const sgst = items.reduce((s, it) => s + toNum(it.sgst_amount), 0);
                const igst = items.reduce((s, it) => s + toNum(it.igst_amount), 0);
                if (igst > 0) {
                  return (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        IGST (input credit)
                      </span>
                      <span className="text-gray-900">
                        {formatCurrency(igst)}
                      </span>
                    </div>
                  );
                }
                if (cgst > 0 || sgst > 0) {
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">CGST (input credit)</span>
                        <span className="text-gray-900">
                          {formatCurrency(cgst)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">SGST (input credit)</span>
                        <span className="text-gray-900">
                          {formatCurrency(sgst)}
                        </span>
                      </div>
                    </>
                  );
                }
                return null;
              })()}
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Bill Total</span>
                <span className="text-gray-900 text-base">
                  {formatCurrency(toNum(purchase.total))}
                </span>
              </div>
              {toNum(purchase.amount_paid) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="text-success-700">
                    -{formatCurrency(toNum(purchase.amount_paid))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold pt-1">
                <span className="text-gray-900">Balance Due</span>
                <span className="text-primary-800 text-base">
                  {formatCurrency(toNum(purchase.balance_due))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
  );
}
