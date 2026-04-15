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
} from "lucide-react";

interface ApiResponse<T> {
  data: T;
}

interface CreditNoteItem {
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

interface CreditNote {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  contact: Contact | null;
  items: CreditNoteItem[];
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
  issued: { label: "Issued", variant: "info" },
  applied: { label: "Applied", variant: "success" },
  partially_paid: { label: "Partially Applied", variant: "warning" },
  paid: { label: "Applied", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

export default function CreditNoteDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: creditNote, isLoading, error } = useQuery<CreditNote>({
    queryKey: ["credit-note", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CreditNote>>(
        `/bill/credit-notes/${id}`
      );
      return res.data;
    },
  });

  const handleExport = () => {
    if (!creditNote) return;
    const rows = [["Item", "HSN/SAC", "Qty", "Rate", "Disc %", "Tax", "Amount"]];
    (creditNote.items || []).forEach((item) => {
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
    rows.push(["", "", "", "", "", "Subtotal", String(toNum(creditNote.subtotal))]);
    rows.push(["", "", "", "", "", "Tax", String(toNum(creditNote.tax_amount))]);
    rows.push(["", "", "", "", "", "Total", String(toNum(creditNote.total))]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credit-note-${creditNote.invoice_number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/credit-notes">
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

  if (error || !creditNote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/credit-notes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Credit Note not found
          </h1>
        </div>
        <Card>
          <div className="py-12 text-center text-gray-500">
            The credit note you are looking for does not exist.
          </div>
        </Card>
      </div>
    );
  }

  const status = statusConfig[creditNote.status] || statusConfig.draft;
  const items = creditNote.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/credit-notes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-11 w-11 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {creditNote.invoice_number}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Credit Note &middot; {formatDate(creditNote.date)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          {creditNote.contact ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                {creditNote.contact.name}
              </p>
              {creditNote.contact.company_name && (
                <p className="text-gray-500">
                  {creditNote.contact.company_name}
                </p>
              )}
              {creditNote.contact.gstin && (
                <p className="text-gray-500">
                  GSTIN: {creditNote.contact.gstin}
                </p>
              )}
              {creditNote.contact.email && (
                <p className="text-gray-500">{creditNote.contact.email}</p>
              )}
              {creditNote.contact.phone && (
                <p className="text-gray-500">{creditNote.contact.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No customer info</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit Note Summary</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Credit Note Number</span>
              <span className="font-medium text-gray-900">
                {creditNote.invoice_number}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">
                {formatDate(creditNote.date)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Applied</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(toNum(creditNote.amount_paid))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Remaining</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(toNum(creditNote.balance_due))}
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

        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">
                  {formatCurrency(toNum(creditNote.subtotal))}
                </span>
              </div>
              {toNum(creditNote.discount_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-danger-600">
                    -{formatCurrency(toNum(creditNote.discount_amount))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-900">
                  {formatCurrency(toNum(creditNote.tax_amount))}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900 text-base">
                  {formatCurrency(toNum(creditNote.total))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {(creditNote.notes || creditNote.terms) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {creditNote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {creditNote.notes}
              </p>
            </Card>
          )}
          {creditNote.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {creditNote.terms}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
