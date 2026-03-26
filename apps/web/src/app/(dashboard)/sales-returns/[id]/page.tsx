"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
}

interface SalesReturnItem {
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

interface SalesReturn {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  date: string;
  due_date: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  contact: Contact | null;
  items: SalesReturnItem[];
  created_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

const statusConfig: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" | "danger" }> = {
  draft: { label: "Draft", variant: "default" },
  approved: { label: "Approved", variant: "info" },
  returned: { label: "Returned", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

// ─── Component ─────────────────────────────────────────────────

export default function SalesReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: salesReturn, isLoading, error } = useQuery<SalesReturn>({
    queryKey: ["sales-return", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SalesReturn>>(
        `/bill/sales-returns/${id}`
      );
      return res.data;
    },
  });

  const handleExport = () => {
    if (!salesReturn) return;
    const rows = [["Item", "HSN/SAC", "Qty", "Rate", "Disc %", "Tax", "Amount"]];
    (salesReturn.items || []).forEach((item) => {
      rows.push([
        item.description,
        item.hsn_code || "",
        String(item.quantity),
        String(toNum(item.rate)),
        String(toNum(item.discount_pct)),
        String(toNum(item.cgst_amount) + toNum(item.sgst_amount) + toNum(item.igst_amount)),
        String(toNum(item.total)),
      ]);
    });
    rows.push(["", "", "", "", "", "Subtotal", String(toNum(salesReturn.subtotal))]);
    rows.push(["", "", "", "", "", "Tax", String(toNum(salesReturn.tax_amount))]);
    rows.push(["", "", "", "", "", "Total", String(toNum(salesReturn.total))]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-return-${salesReturn.invoice_number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  // ─── Loading ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/sales-returns">
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

  if (error || !salesReturn) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/sales-returns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Sales Return not found
          </h1>
        </div>
        <Card>
          <div className="py-12 text-center text-gray-500">
            The sales return you are looking for does not exist.
          </div>
        </Card>
      </div>
    );
  }

  const status = statusConfig[salesReturn.status] || statusConfig.draft;
  const items = salesReturn.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales-returns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-11 w-11 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {salesReturn.invoice_number}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Sales Return &middot; {formatDate(salesReturn.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          {salesReturn.contact ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                {salesReturn.contact.name}
              </p>
              {salesReturn.contact.company_name && (
                <p className="text-gray-500">
                  {salesReturn.contact.company_name}
                </p>
              )}
              {salesReturn.contact.gstin && (
                <p className="text-gray-500">
                  GSTIN: {salesReturn.contact.gstin}
                </p>
              )}
              {salesReturn.contact.email && (
                <p className="text-gray-500">{salesReturn.contact.email}</p>
              )}
              {salesReturn.contact.phone && (
                <p className="text-gray-500">{salesReturn.contact.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No customer info</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Return Summary</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Return Number</span>
              <span className="font-medium text-gray-900">
                {salesReturn.invoice_number}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">
                {formatDate(salesReturn.date)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            {salesReturn.notes && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reason / Notes</span>
                <span className="text-gray-700 text-right max-w-[200px]">
                  {salesReturn.notes}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

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
                  Tax
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const taxAmount =
                  toNum(item.cgst_amount) +
                  toNum(item.sgst_amount) +
                  toNum(item.igst_amount);
                const taxRate =
                  toNum(item.cgst_rate) +
                  toNum(item.sgst_rate) +
                  toNum(item.igst_rate);
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
                      <div>{formatCurrency(taxAmount)}</div>
                      {taxRate > 0 && (
                        <div className="text-xs text-gray-400">
                          @{taxRate}%
                        </div>
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

        {/* Totals */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">
                  {formatCurrency(toNum(salesReturn.subtotal))}
                </span>
              </div>
              {toNum(salesReturn.discount_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-danger-600">
                    -{formatCurrency(toNum(salesReturn.discount_amount))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-900">
                  {formatCurrency(toNum(salesReturn.tax_amount))}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900 text-base">
                  {formatCurrency(toNum(salesReturn.total))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes & Terms */}
      {(salesReturn.notes || salesReturn.terms) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {salesReturn.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {salesReturn.notes}
              </p>
            </Card>
          )}
          {salesReturn.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {salesReturn.terms}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
