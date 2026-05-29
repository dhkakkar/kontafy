"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, CreditCard, CheckCircle2 } from "lucide-react";
import {
  PaymentAllocationTable,
  type PaymentAllocation,
} from "@/components/payments/PaymentAllocationTable";
import { BankCashAccountSelect } from "@/components/payments/BankCashAccountSelect";
import { getPaymentModeUi } from "@/components/payments/paymentModeFields";

/**
 * Record Receipt page — customer paying us.
 *
 * Bill-wise settlement: the user can split the receipt across one or
 * more outstanding invoices for the same customer (FIFO suggested via
 * "Apply to Oldest"). Anything not allocated is treated as an advance
 * and the backend posts it to 2116 (Advance from Customers) with a
 * confirmation banner shown before submit.
 *
 * Bank/Cash account is mandatory — every receipt must hit a specific
 * cash or bank ledger so reconciliation can work. The picker auto-
 * selects "Cash in Hand" when payment method is cash.
 */

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
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Mode-driven UI hints: bank picker visibility, reference field
  // label/placeholder, optional bank hint. Centralised so all three
  // Record Payment surfaces stay consistent.
  const modeUi = getPaymentModeUi(form.method);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice]);

  const createPaymentMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/bill/payments", data),
    onSuccess: () => {
      // Touch every cache that surfaces invoice/payment data so the
      // user doesn't see stale numbers on the next page (the global
      // staleTime: 60s would otherwise hide the new receipt).
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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

    if (!invoice?.contact_id) {
      setError("Invoice has no contact linked. Cannot record payment.");
      return;
    }

    // Cash mode skips the bank picker — every other mode requires it.
    if (!modeUi.isCash && !bankAccountId) {
      setError("Please select a bank account for this payment mode.");
      return;
    }

    const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
    const advance = Math.max(0, Math.round((amount - totalAllocated) * 100) / 100);

    if (Math.round(totalAllocated * 100) > Math.round(amount * 100)) {
      setError(
        `Total allocated (${formatCurrency(totalAllocated)}) exceeds payment amount (${formatCurrency(amount)}). Adjust the allocation rows.`,
      );
      return;
    }

    // Confirm advance before submitting — easy to misjudge a receipt
    // and accidentally book a chunk as advance.
    if (advance > 0) {
      const ok = window.confirm(
        `${formatCurrency(advance)} will be recorded as an Advance from Customer (account 2116). Continue?`,
      );
      if (!ok) return;
    }

    createPaymentMutation.mutate({
      type: "received",
      contact_id: invoice.contact_id,
      amount,
      date: form.date,
      method: form.method,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      // Cash mode → null; backend falls back to 1101 Cash in Hand
      // via the method='cash' branch in postPayment().
      bank_account_id: modeUi.isCash ? null : bankAccountId,
      // Backend treats empty allocations as a pure advance — exactly
      // what we want when the user clears every cell or there are no
      // outstanding invoices for the contact.
      allocations,
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

  const paymentAmountNum = Number(form.amount) || 0;

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
        <div className="lg:col-span-2 space-y-6">
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
                  hint={`This invoice's balance: ${formatCurrency(balanceDue)}`}
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
                  onChange={(v) => {
                    setForm({ ...form, method: v });
                    // Clear bank pick when switching to cash so a
                    // stale selection doesn't carry over (also no-ops
                    // when switching the other way).
                    if (v === "cash") setBankAccountId(null);
                  }}
                />
                {/* Bank picker is only meaningful for non-cash modes —
                    cash auto-routes to ledger 1101. */}
                {modeUi.showBankPicker ? (
                  <div>
                    <BankCashAccountSelect
                      value={bankAccountId}
                      onChange={(next) => setBankAccountId(next.bankAccountId)}
                    />
                    {modeUi.bankHint && (
                      <p className="text-xs text-gray-500 mt-1">
                        {modeUi.bankHint}
                      </p>
                    )}
                  </div>
                ) : (
                  // Reserve the column so the grid layout stays stable
                  // when cash is selected (avoids "Method" centering
                  // alone on its row).
                  <div className="hidden md:block" />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={modeUi.referenceLabel}
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  placeholder={modeUi.referencePlaceholder}
                />
                <Input
                  label="Notes (Optional)"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="Add a note about this payment"
                />
              </div>

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
                  disabled={
                    !form.amount ||
                    !form.date ||
                    (!modeUi.isCash && !bankAccountId)
                  }
                  icon={<CreditCard className="h-4 w-4" />}
                >
                  Record Payment
                </Button>
              </div>
            </form>
          </Card>

          {/* Apply Payment To — bill-wise allocation */}
          <Card>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Apply Payment To
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Distribute this receipt across one or more outstanding
                invoices for {invoice.contact?.company_name || invoice.contact?.name || "this customer"}.
                Leave the cells empty to record the whole amount as an advance.
              </p>
            </div>
            <PaymentAllocationTable
              contactId={invoice.contact_id}
              paymentAmount={paymentAmountNum}
              direction="receive"
              defaultInvoiceId={invoiceId}
              onChange={setAllocations}
            />
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
