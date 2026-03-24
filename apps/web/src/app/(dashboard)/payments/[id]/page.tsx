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
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
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

  // Edit form state
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formMethod, setFormMethod] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formNotes, setFormNotes] = useState("");

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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment", paymentId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setShowEditModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/bill/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
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
        <div className="lg:col-span-2">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label="Date"
                value={formatDate(payment.date)}
              />
              <DetailRow
                icon={<User className="h-4 w-4" />}
                label="Contact"
                value={contactName}
              />
              <DetailRow
                icon={<CreditCard className="h-4 w-4" />}
                label="Payment Mode"
                value={methodLabels[payment.method] || payment.method || "-"}
              />
              <DetailRow
                icon={<Hash className="h-4 w-4" />}
                label="Reference / Transaction ID"
                value={payment.reference || "-"}
              />
              {payment.invoice_number && (
                <DetailRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Invoice"
                  value={payment.invoice_number}
                />
              )}
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
        description="Update the payment details"
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
            onChange={setFormMethod}
            placeholder="Select mode"
          />
          <Input
            label="Reference / Transaction ID"
            value={formReference}
            onChange={(e) => setFormReference(e.target.value)}
            placeholder="Optional reference number"
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
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            loading={updateMutation.isPending}
            disabled={!formAmount || !formMethod}
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
