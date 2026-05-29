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
import { ArrowLeft, CreditCard, CheckCircle2, Info } from "lucide-react";
import {
  PaymentAllocationTable,
  type PaymentAllocation,
} from "@/components/payments/PaymentAllocationTable";
import { BankCashAccountSelect } from "@/components/payments/BankCashAccountSelect";
import { getPaymentModeUi } from "@/components/payments/paymentModeFields";

/**
 * Record Payment page — we are paying a vendor.
 *
 * Mirror of the sales-side Record Receipt page. Allocates the payment
 * across one or more outstanding vendor bills (FIFO suggested via
 * "Apply to Oldest"); the gap between payment amount and total
 * allocations is booked to 1112 (Advance to Vendors) by the JE poster.
 *
 * Bank/Cash account is mandatory — the cash side of the JE.
 *
 * TDS note: v1 of bill-wise settlement enters the *gross* payment
 * amount (₹17,700 in the spec example). If the user is deducting
 * TDS, they should currently pay the gross and post a separate
 * journal entry for the TDS deduction. Wiring the TDS-deducted-on-
 * bill flow through postPayment is a v2 task (TdsEntry model has no
 * JE integration today).
 */

interface Purchase {
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

function toNum(v: unknown): number {
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

export default function RecordPurchasePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;
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

  const { data: purchase, isLoading } = useQuery<Purchase>({
    queryKey: ["purchase", billId],
    queryFn: async () => {
      const res = await api.get<{ data: Purchase }>(
        `/bill/purchases/${billId}`,
      );
      return (res as any)?.data ?? res;
    },
  });

  // Pre-fill amount with the balance due as soon as the bill loads.
  React.useEffect(() => {
    if (purchase && !form.amount) {
      const balanceDue = toNum(purchase.balance_due);
      if (balanceDue > 0) {
        setForm((f) => ({ ...f, amount: balanceDue.toString() }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase]);

  const createPaymentMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/bill/payments", data),
    onSuccess: async () => {
      // Bust every cache that surfaces purchase/payment data so the
      // user sees the new state immediately on the next page. The
      // payment-outstanding-modal key is also wiped — the standalone
      // /payments Record Payment modal reads outstanding from there
      // and would otherwise still list this just-settled bill.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase", billId] }),
        queryClient.invalidateQueries({ queryKey: ["purchases"] }),
        queryClient.invalidateQueries({ queryKey: ["purchases-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["payments-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["payment-outstanding"] }),
        queryClient.invalidateQueries({ queryKey: ["payment-outstanding-modal"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      router.push(`/purchases/${billId}`);
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

    if (!purchase?.contact_id) {
      setError("Bill has no vendor linked. Cannot record payment.");
      return;
    }

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

    if (advance > 0) {
      const ok = window.confirm(
        `${formatCurrency(advance)} will be recorded as an Advance to Vendor (account 1112). Continue?`,
      );
      if (!ok) return;
    }

    createPaymentMutation.mutate({
      // type=made marks this as money going OUT to a vendor.
      // PaymentsService.create routes the JE accordingly: Dr A/P,
      // Cr Bank/Cash.
      type: "made",
      contact_id: purchase.contact_id,
      amount,
      date: form.date,
      method: form.method,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      bank_account_id: modeUi.isCash ? null : bankAccountId,
      allocations,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/purchases/${billId}`}>
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

  if (!purchase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Bill not found</h1>
        </div>
      </div>
    );
  }

  const balanceDue = toNum(purchase.balance_due);
  const isPaid = purchase.status === "paid" || balanceDue <= 0;

  if (isPaid) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/purchases/${billId}`}>
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
              Bill Fully Paid
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {purchase.invoice_number} has been fully paid.
            </p>
            <Link href={`/purchases/${billId}`}>
              <Button variant="outline">Back to Bill</Button>
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
        <Link href={`/purchases/${billId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
          <p className="text-sm text-gray-500">
            {purchase.invoice_number}
            {purchase.contact && (
              <span>
                {" "}
                | To {purchase.contact.company_name || purchase.contact.name}
              </span>
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
                  hint={`This bill's balance: ${formatCurrency(balanceDue)}`}
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
                    if (v === "cash") setBankAccountId(null);
                  }}
                />
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
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Add a note about this payment"
                />
              </div>

              {/* TDS guidance — v1 doesn't auto-deduct TDS at payment
                  time. Surface a one-line nudge so users with TDS
                  vendors know they need a separate JE. */}
              <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                <span>
                  Enter the <span className="font-medium">gross</span> amount
                  payable to the vendor. If you&apos;re deducting TDS, post a
                  separate journal entry for the TDS portion (TDS-on-payment
                  automation lands in a later release).
                </span>
              </div>

              {error && (
                <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Link href={`/purchases/${billId}`}>
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
                Distribute this payment across one or more outstanding bills
                from {purchase.contact?.company_name || purchase.contact?.name || "this vendor"}.
                Leave the cells empty to record the whole amount as an advance.
              </p>
            </div>
            <PaymentAllocationTable
              contactId={purchase.contact_id}
              paymentAmount={paymentAmountNum}
              direction="pay"
              defaultInvoiceId={billId}
              onChange={setAllocations}
            />
          </Card>
        </div>

        {/* Bill Summary Sidebar */}
        <div>
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Bill Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Bill</span>
                <span className="font-medium text-gray-900">
                  {purchase.invoice_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-700">
                  {formatDate(purchase.date)}
                </span>
              </div>
              {purchase.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span className="text-gray-700">
                    {formatDate(purchase.due_date)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(toNum(purchase.total))}
                  </span>
                </div>
              </div>
              {toNum(purchase.amount_paid) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-success-700">
                    - {formatCurrency(toNum(purchase.amount_paid))}
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
