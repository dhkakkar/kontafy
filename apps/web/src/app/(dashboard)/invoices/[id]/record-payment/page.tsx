"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, CreditCard, CheckCircle2 } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  date: string;
  due_date: string | null;
  contact_id: string | null;
  contact: {
    id: string;
    name: string;
    company_name: string | null;
  } | null;
}

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

const paymentMethods = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function RecordPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", invoiceId],
    queryFn: () => api.get(`/bill/invoices/${invoiceId}`),
  });

  // Pre-fill amount when invoice loads
  React.useEffect(() => {
    if (invoice && !form.amount) {
      const balanceDue = toNum(invoice.balance_due);
      if (balanceDue > 0) {
        setForm((f) => ({ ...f, amount: balanceDue.toString() }));
      }
    }
  }, [invoice]);

  const createPaymentMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/bill/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      router.push(`/invoices/${invoiceId}`);
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to record payment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const balanceDue = toNum(invoice?.balance_due);
    if (amount > balanceDue) {
      setError(
        `Amount cannot exceed balance due (${formatCurrency(balanceDue)})`
      );
      return;
    }

    if (!invoice?.contact_id) {
      setError("Invoice has no contact linked. Cannot record payment.");
      return;
    }

    createPaymentMutation.mutate({
      type: "received",
      contact_id: invoice.contact_id,
      invoice_id: invoiceId,
      amount,
      date: form.date,
      method: form.method,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <Card>
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Invoice not found</h1>
        </div>
      </div>
    );
  }

  const balanceDue = toNum(invoice.balance_due);
  const isPaid = invoice.status === "paid" || balanceDue <= 0;

  if (isPaid) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
        </div>
        <Card>
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-success-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Invoice Fully Paid
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {invoice.invoice_number} has been fully paid.
            </p>
            <Link href={`/invoices/${invoiceId}`}>
              <Button variant="outline">Back to Invoice</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/invoices/${invoiceId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
          <p className="text-sm text-gray-500">
            {invoice.invoice_number}
            {invoice.contact && (
              <span> | {invoice.contact.company_name || invoice.contact.name}</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  placeholder="0.00"
                  hint={`Balance due: ${formatCurrency(balanceDue)}`}
                />
                <Input
                  label="Payment Date"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm({ ...form, date: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Payment Method"
                  options={paymentMethods}
                  value={form.method}
                  onChange={(v) => setForm({ ...form, method: v })}
                />
                <Input
                  label="Reference Number"
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  placeholder="e.g., UTR, cheque number"
                />
              </div>

              <Input
                label="Notes (Optional)"
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                placeholder="Add a note about this payment"
              />

              {error && (
                <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Link href={`/invoices/${invoiceId}`}>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  loading={createPaymentMutation.isPending}
                  disabled={!form.amount || !form.date}
                  icon={<CreditCard className="h-4 w-4" />}
                >
                  Record Payment
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Invoice Summary Sidebar */}
        <div>
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Invoice Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice</span>
                <span className="font-medium text-gray-900">
                  {invoice.invoice_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-700">
                  {formatDate(invoice.date)}
                </span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span className="text-gray-700">
                    {formatDate(invoice.due_date)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(toNum(invoice.total))}
                  </span>
                </div>
              </div>
              {toNum(invoice.amount_paid) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-success-700">
                    - {formatCurrency(toNum(invoice.amount_paid))}
                  </span>
                </div>
              )}
              <div className="bg-primary-50 rounded-lg p-3 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-primary-800">
                    Balance Due
                  </span>
                  <span className="font-bold text-primary-800 text-base">
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
