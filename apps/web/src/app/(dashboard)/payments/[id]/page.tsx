"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  CreditCard,
  Calendar,
  User,
  Hash,
  FileText,
  Loader2,
  Landmark,
  Info,
} from "lucide-react";
import { BankCashAccountSelect } from "@/components/payments/BankCashAccountSelect";
import { getPaymentModeUi } from "@/components/payments/paymentModeFields";

// ─── Types ─────────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
}

interface PaymentAllocation {
  id: string;
  amount: number;
  invoice?: {
    id: string;
    invoice_number: string;
    total: number;
    balance_due: number;
  } | null;
}

interface BankAccountRef {
  id: string;
  bank_name?: string | null;
  account_name?: string | null;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  type: "received" | "made";
  reference?: string | null;
  notes?: string | null;
  contact_name?: string;
  contact_id?: string | null;
  contact?: { id: string; name: string };
  invoice_number?: string;
  bank_account_id?: string | null;
  bank_account?: BankAccountRef | null;
  allocations?: PaymentAllocation[];
  created_at?: string;
  updated_at?: string;
}

const methodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
};

// ─── Component ─────────────────────────────────────────────────

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit form state — mirrors the Record Payment form's shape so the
  // bank picker + mode-driven reference label behave the same here
  // as they do on the create flows.
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formMethod, setFormMethod] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formBankAccountId, setFormBankAccountId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Mode-driven UI hints (bank picker visibility, reference label).
  const modeUi = getPaymentModeUi(formMethod);

  // ─── Queries ──────────────────────────────────────────────────

  const { data: payment, isLoading } = useQuery<Payment>({
    queryKey: ["payment", paymentId],
    queryFn: () =>
      api.get<ApiResponse<Payment>>(`/bill/payments/${paymentId}`).then((res) => res.data),
  });

  // ─── Mutations ────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/bill/payments/${paymentId}`, {
        amount: parseFloat(formAmount),
        date: formDate,
        method: formMethod,
        reference: formReference || undefined,
        notes: formNotes || undefined,
        // Cash mode → null bank_account_id; postPayment falls back
        // to 1101 via the method=cash branch.
        bank_account_id: modeUi.isCash ? null : formBankAccountId,
      }),
    onSuccess: () => {
      // Editing payment fields can shift the JE (mode/bank changed
      // → different cash-side ledger), so bust everything that
      // touches payment / invoice balance / ledger state.
      queryClient.invalidateQueries({ queryKey: ["payment", paymentId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payments-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
      queryClient.invalidateQueries({ queryKey: ["purchase"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchases-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment-outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["payment-outstanding-modal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowEditModal(false);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to update payment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/bill/payments/${paymentId}`),
    onSuccess: () => {
      // Delete reverses allocations + JE on the backend, so every
      // payment-affected cache needs to refresh.
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payments-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
      queryClient.invalidateQueries({ queryKey: ["purchase"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchases-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment-outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["payment-outstanding-modal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/payments");
    },
  });

  // ─── Helpers ──────────────────────────────────────────────────

  const openEditModal = () => {
    if (!payment) return;
    setFormAmount(String(payment.amount));
    setFormDate(payment.date?.split("T")[0] || "");
    setFormMethod(payment.method || "");
    setFormReference(payment.reference || "");
    setFormNotes(payment.notes || "");
    setFormBankAccountId(payment.bank_account_id || null);
    setFormError(null);
    setShowEditModal(true);
  };

  // ─── Loading ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <Card>
          <div className="h-60 bg-gray-100 rounded animate-pulse" />
        </Card>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Payment not found</h1>
        </div>
      </div>
    );
  }

  const contactName = payment.contact_name || payment.contact?.name || "-";
  const isReceived = payment.type === "received";
  const bankLabel = payment.bank_account
    ? payment.bank_account.bank_name
      ? `${payment.bank_account.bank_name} — ${payment.bank_account.account_name || ""}`.trim()
      : payment.bank_account.account_name || "Bank Account"
    : payment.method === "cash"
      ? "Cash in Hand"
      : "—";

  const allocations = payment.allocations || [];
  const totalAllocated = allocations.reduce(
    (s, a) => s + (Number(a.amount) || 0),
    0,
  );
  const advance = Math.max(0, Number(payment.amount) - totalAllocated);

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Details
            </h1>
            <Badge variant={isReceived ? "success" : "warning"} dot>
              {isReceived ? "Received" : "Made"}
            </Badge>
          </div>
          {payment.created_at && (
            <p className="text-sm text-gray-500 mt-0.5">
              Recorded {formatDate(payment.created_at)}
            </p>
          )}
        </div>
      </div>

      {/* ─── Actions Bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          icon={<Edit3 className="h-4 w-4" />}
          onClick={openEditModal}
        >
          Edit
        </Button>
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

      {/* ─── Main Content ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Payment Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label="Date"
                value={formatDate(payment.date)}
              />
              <DetailRow
                icon={<User className="h-4 w-4" />}
                label={isReceived ? "Customer" : "Vendor"}
                value={contactName}
              />
              <DetailRow
                icon={<CreditCard className="h-4 w-4" />}
                label="Payment Mode"
                value={methodLabels[payment.method] || payment.method || "-"}
              />
              <DetailRow
                icon={<Landmark className="h-4 w-4" />}
                label={payment.method === "cash" ? "Account" : "Bank Account"}
                value={bankLabel}
              />
              <DetailRow
                icon={<Hash className="h-4 w-4" />}
                label={getPaymentModeUi(payment.method).referenceLabel}
                value={payment.reference || "-"}
              />
              {payment.notes && (
                <div className="md:col-span-2">
                  <DetailRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Notes"
                    value={payment.notes}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Allocation breakdown — shows which invoice(s) this
              payment was applied to, plus any advance portion. */}
          <Card>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Applied To
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  How this payment was distributed across{" "}
                  {isReceived ? "invoices" : "bills"} and advances.
                </p>
              </div>
              <span
                title="To change the allocation, delete this payment and record a new one."
                className="text-gray-400 mt-0.5"
              >
                <Info className="h-3.5 w-3.5 shrink-0" />
              </span>
            </div>

            {allocations.length === 0 && advance === 0 && (
              <p className="text-sm text-gray-500">
                No allocation recorded for this payment.
              </p>
            )}

            {allocations.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isReceived ? "Invoice" : "Bill"}
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Original Total
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remaining Balance
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allocations.map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2">
                          {a.invoice ? (
                            <Link
                              href={
                                isReceived
                                  ? `/invoices/${a.invoice.id}`
                                  : `/purchases/${a.invoice.id}`
                              }
                              className="font-medium text-primary-800 hover:underline"
                            >
                              {a.invoice.invoice_number}
                            </Link>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                          {a.invoice ? formatCurrency(Number(a.invoice.total)) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                          {a.invoice
                            ? formatCurrency(Number(a.invoice.balance_due))
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">
                          {formatCurrency(Number(a.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {advance > 0 && (
              <div className="mt-3 flex items-start gap-2 text-xs bg-amber-50 text-amber-800 rounded-md px-3 py-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>{formatCurrency(advance)}</strong> recorded as{" "}
                  {isReceived
                    ? "Advance from Customer (2116)"
                    : "Advance to Vendor (1112)"}{" "}
                  — no specific {isReceived ? "invoice" : "bill"} settled.
                </span>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3 italic">
              To change which {isReceived ? "invoice" : "bill"} this settles,
              delete this payment and record a new one.
            </p>
          </Card>
        </div>

        {/* Right Column: Amount */}
        <div>
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Amount
            </h3>
            <div
              className={`text-3xl font-bold ${
                isReceived ? "text-success-700" : "text-warning-700"
              }`}
            >
              {isReceived ? "+" : "-"} {formatCurrency(payment.amount)}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Payment {isReceived ? "received from" : "made to"}{" "}
              <span className="font-medium text-gray-700">{contactName}</span>
            </p>
          </Card>
        </div>
      </div>

      {/* ─── Edit Modal ──────────────────────────────────────── */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Payment"
        description="Update the payment details. Allocation changes require deleting and re-recording the payment."
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Amount"
            type="number"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Payment Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />
          <Select
            label="Payment Mode"
            options={[
              { value: "cash", label: "Cash" },
              { value: "upi", label: "UPI" },
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "cheque", label: "Cheque" },
              { value: "card", label: "Card" },
            ]}
            value={formMethod}
            onChange={(v) => {
              setFormMethod(v);
              // Switching to cash → drop any bank pick so it doesn't
              // leak into the cash JE.
              if (v === "cash") setFormBankAccountId(null);
            }}
            placeholder="Select mode"
          />
          {modeUi.showBankPicker ? (
            <div>
              <BankCashAccountSelect
                value={formBankAccountId}
                onChange={(next) => setFormBankAccountId(next.bankAccountId)}
              />
              {modeUi.bankHint && (
                <p className="text-xs text-gray-500 mt-1">
                  {modeUi.bankHint}
                </p>
              )}
            </div>
          ) : (
            // Reserve the column so the grid stays balanced when cash
            // is selected — otherwise Mode jumps to centre alone.
            <div className="hidden md:block" />
          )}
          <Input
            label={modeUi.referenceLabel}
            value={formReference}
            onChange={(e) => setFormReference(e.target.value)}
            placeholder={modeUi.referencePlaceholder}
          />
          <div className="md:col-span-2">
            <Input
              label="Notes"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Add any notes..."
            />
          </div>
        </div>

        {/* Allocation hint — Edit doesn't currently allow shifting
            allocations because backend update() leaves them alone.
            Surface this loudly so users don't expect otherwise. */}
        {allocations.length > 0 && (
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
            <span>
              This payment is applied to{" "}
              <strong>
                {allocations
                  .map((a) => a.invoice?.invoice_number || "—")
                  .join(", ")}
              </strong>
              . To change the allocation, cancel here, delete the payment,
              and record a new one with the correct{" "}
              {isReceived ? "invoice" : "bill"}.
            </span>
          </div>
        )}

        {formError && (
          <div className="mt-4 p-3 bg-danger-50 text-danger-700 text-sm rounded-lg">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setFormError(null);
              if (!modeUi.isCash && !formBankAccountId) {
                setFormError(
                  "Please select a bank account for this payment mode.",
                );
                return;
              }
              updateMutation.mutate();
            }}
            loading={updateMutation.isPending}
            disabled={
              !formAmount ||
              !formMethod ||
              (!modeUi.isCash && !formBankAccountId)
            }
          >
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* ─── Delete Confirmation Modal ───────────────────────── */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This action cannot be undone."
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
            Delete Payment
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
