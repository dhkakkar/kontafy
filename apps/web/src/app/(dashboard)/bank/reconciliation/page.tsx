"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Link as LinkIcon,
  X,
} from "lucide-react";
import Link from "next/link";

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string | null;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: string;
  is_reconciled: boolean;
  ai_suggestion: any;
  bank_account?: { account_name: string; bank_name: string | null };
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  date: string;
  reference: string | null;
  method: string | null;
  contact?: { name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  total: number;
  balance_due: number;
  date: string;
  status: string;
  contact?: { name: string } | null;
}

interface ReconciliationSummary {
  total_transactions: number;
  reconciled_count: number;
  unreconciled_count: number;
  reconciled_pct: number;
}

interface AutoMatchResult {
  matches: Array<{
    transaction_id: string;
    matched_to: string;
    matched_id: string;
    matched_reference: string;
    amount: number;
    confidence: number;
  }>;
  auto_reconciled: number;
}

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<{
    type: "payment" | "invoice";
    id: string;
  } | null>(null);

  // Queries
  const { data: accounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: () => api.get("/bank/accounts"),
  });

  const { data: summary } = useQuery<ReconciliationSummary>({
    queryKey: ["reconciliation-summary", selectedAccountId],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (selectedAccountId) params.bank_account_id = selectedAccountId;
      return api.get("/bank/reconciliation/summary", params);
    },
  });

  const { data: unreconciledTxns = [], isLoading: txnsLoading } = useQuery<
    BankTransaction[]
  >({
    queryKey: ["unreconciled-transactions", selectedAccountId],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (selectedAccountId) params.bank_account_id = selectedAccountId;
      return api.get("/bank/transactions/unreconciled", params);
    },
  });

  // Get unmatched payments and invoices for the right panel
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["payments-for-reconciliation"],
    queryFn: () => api.get("/bill/payments", { unmatched: "true" }),
    enabled: true,
  });

  const { data: invoicesRes } = useQuery<{ data: Invoice[] }>({
    queryKey: ["invoices-for-reconciliation"],
    queryFn: () =>
      api.get("/bill/invoices", { status: "sent,overdue,partial" }),
    enabled: true,
  });
  const invoices = invoicesRes?.data ?? (invoicesRes as unknown as Invoice[]) ?? [];

  // Auto-match mutation
  const autoMatchMutation = useMutation<AutoMatchResult>({
    mutationFn: () =>
      api.post("/bank/reconciliation/auto-match", {
        bank_account_id: selectedAccountId,
        date_tolerance_days: 7,
        amount_tolerance_pct: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["unreconciled-transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["reconciliation-summary"],
      });
    },
  });

  // Manual reconcile mutation
  const reconcileMutation = useMutation({
    mutationFn: ({
      txnId,
      data,
    }: {
      txnId: string;
      data: Record<string, unknown>;
    }) => api.patch(`/bank/transactions/${txnId}/reconcile`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["unreconciled-transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["reconciliation-summary"],
      });
      setSelectedTxn(null);
      setSelectedMatch(null);
    },
  });

  const handleManualMatch = () => {
    if (!selectedTxn || !selectedMatch) return;
    const data: Record<string, unknown> = {};
    if (selectedMatch.type === "payment") data.payment_id = selectedMatch.id;
    if (selectedMatch.type === "invoice") data.invoice_id = selectedMatch.id;
    reconcileMutation.mutate({ txnId: selectedTxn.id, data });
  };

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.account_name}${a.bank_name ? ` (${a.bank_name})` : ""}`,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/bank">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Bank Reconciliation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Match bank transactions to invoices and payments
          </p>
        </div>
      </div>

      {/* Filters + Summary */}
      <div className="flex items-end gap-4">
        <div className="w-72">
          <Select
            label="Bank Account"
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            options={[
              { value: "", label: "All Accounts" },
              ...accountOptions,
            ]}
            placeholder="Select bank account"
          />
        </div>
        {selectedAccountId && (
          <Button
            variant="secondary"
            icon={<Zap className="h-4 w-4" />}
            onClick={() => autoMatchMutation.mutate()}
            loading={autoMatchMutation.isPending}
          >
            Auto-Match
          </Button>
        )}

        {/* Summary Stats */}
        <div className="ml-auto flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-gray-500">Total</p>
            <p className="font-bold text-gray-900">
              {summary?.total_transactions ?? 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-success-700">Matched</p>
            <p className="font-bold text-success-700">
              {summary?.reconciled_count ?? 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-warning-700">Unmatched</p>
            <p className="font-bold text-warning-700">
              {summary?.unreconciled_count ?? 0}
            </p>
          </div>
          <div className="text-center">
            <div className="h-8 w-8 rounded-full border-4 border-success-500 flex items-center justify-center mx-auto">
              <span className="text-[10px] font-bold text-success-700">
                {summary?.reconciled_pct ?? 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-match results banner */}
      {autoMatchMutation.isSuccess && autoMatchMutation.data && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-success-700" />
            <span className="font-medium text-success-800">
              Auto-match complete
            </span>
          </div>
          <p className="text-sm text-success-700">
            Found {autoMatchMutation.data.matches.length} matches,{" "}
            {autoMatchMutation.data.auto_reconciled} auto-reconciled (90%+
            confidence).
          </p>
        </div>
      )}

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Unmatched Bank Transactions */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">
              Unmatched Bank Transactions
            </h3>
            <p className="text-xs text-gray-500">
              {unreconciledTxns.length} transactions pending reconciliation
            </p>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
            {txnsLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : unreconciledTxns.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-success-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  All transactions are reconciled!
                </p>
              </div>
            ) : (
              unreconciledTxns.map((txn) => (
                <div
                  key={txn.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedTxn?.id === txn.id
                      ? "bg-primary-50 border-l-4 border-primary-500"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedTxn(txn);
                    setSelectedMatch(null);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {txn.type === "debit" ? (
                        <ArrowUpRight className="h-4 w-4 text-danger-500 shrink-0" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-success-700 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {txn.description || "No description"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(txn.date)}
                          {txn.bank_account
                            ? ` | ${txn.bank_account.account_name}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          txn.type === "debit"
                            ? "text-danger-600"
                            : "text-success-700"
                        }`}
                      >
                        {txn.type === "debit" ? "-" : "+"}
                        {formatCurrency(Number(txn.amount))}
                      </p>
                      {txn.ai_suggestion && (
                        <Badge variant="info" className="mt-1">
                          Suggested
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Right: Invoices & Payments to match */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">
              Invoices & Payments
            </h3>
            <p className="text-xs text-gray-500">
              {selectedTxn
                ? `Select a match for "${selectedTxn.description || "transaction"}" (${formatCurrency(Number(selectedTxn.amount))})`
                : "Click a transaction on the left to start matching"}
            </p>
          </div>

          {!selectedTxn ? (
            <div className="p-8 text-center">
              <LinkIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Select a transaction to see matching options
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {/* Payments Section */}
              {Array.isArray(payments) && payments.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-gray-100 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Payments
                  </div>
                  <div className="divide-y divide-gray-50">
                    {payments
                      .filter((p) => {
                        // Show payments with similar amounts
                        const amtDiff = Math.abs(
                          Number(p.amount) - Number(selectedTxn.amount)
                        );
                        return amtDiff / Number(selectedTxn.amount) < 0.1; // within 10%
                      })
                      .map((payment) => (
                        <div
                          key={payment.id}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedMatch?.type === "payment" &&
                            selectedMatch?.id === payment.id
                              ? "bg-success-50 border-l-4 border-success-500"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() =>
                            setSelectedMatch({
                              type: "payment",
                              id: payment.id,
                            })
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {payment.contact?.name || "Payment"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(payment.date)}
                                {payment.reference
                                  ? ` | Ref: ${payment.reference}`
                                  : ""}
                                {payment.method
                                  ? ` | ${payment.method}`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {formatCurrency(Number(payment.amount))}
                              </p>
                              <Badge
                                variant={
                                  payment.type === "received"
                                    ? "success"
                                    : "info"
                                }
                              >
                                {payment.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* Invoices Section */}
              {Array.isArray(invoices) && invoices.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-gray-100 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Invoices
                  </div>
                  <div className="divide-y divide-gray-50">
                    {invoices
                      .filter((inv) => {
                        const invAmount = Number(
                          inv.balance_due ?? inv.total ?? 0
                        );
                        const amtDiff = Math.abs(
                          invAmount - Number(selectedTxn.amount)
                        );
                        return invAmount > 0 && amtDiff / Number(selectedTxn.amount) < 0.1;
                      })
                      .map((invoice) => (
                        <div
                          key={invoice.id}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedMatch?.type === "invoice" &&
                            selectedMatch?.id === invoice.id
                              ? "bg-success-50 border-l-4 border-success-500"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() =>
                            setSelectedMatch({
                              type: "invoice",
                              id: invoice.id,
                            })
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {invoice.invoice_number}
                              </p>
                              <p className="text-xs text-gray-500">
                                {invoice.contact?.name || ""}
                                {" | "}
                                {formatDate(invoice.date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {formatCurrency(
                                  Number(invoice.balance_due ?? invoice.total)
                                )}
                              </p>
                              <Badge
                                variant={
                                  invoice.type === "sales"
                                    ? "success"
                                    : "warning"
                                }
                              >
                                {invoice.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* Show all invoices/payments if none match */}
              {((!Array.isArray(payments) || payments.length === 0) &&
                (!Array.isArray(invoices) || invoices.length === 0)) && (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">
                    No matching invoices or payments found
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Match Action Bar */}
          {selectedTxn && selectedMatch && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Matching to{" "}
                <span className="font-medium text-gray-900">
                  {selectedMatch.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMatch(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleManualMatch}
                  loading={reconcileMutation.isPending}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Confirm Match
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
