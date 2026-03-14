"use client";

import React, { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Upload,
  Plus,
  CheckCircle2,
  Circle,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  account_type: string | null;
  opening_balance: number;
  current_balance: number;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string | null;
  reference: string | null;
  amount: number;
  type: string;
  balance: number | null;
  source: string;
  is_reconciled: boolean;
  matched_entry_id: string | null;
  ai_suggestion: any;
}

interface TransactionsResponse {
  data: BankTransaction[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  date: string;
  reference: string | null;
  contact?: { name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  total: number;
  balance_due: number;
  date: string;
  contact?: { name: string } | null;
}

export default function BankAccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("all");
  const [showAddTxnModal, setShowAddTxnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [txnForm, setTxnForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    amount: "",
    type: "debit",
  });

  const [reconcileForm, setReconcileForm] = useState({
    match_type: "",
    payment_id: "",
    invoice_id: "",
  });

  // Queries
  const { data: account } = useQuery<BankAccount>({
    queryKey: ["bank-account", accountId],
    queryFn: () => api.get(`/bank/accounts/${accountId}/balance`),
  });

  const { data: transactionsRes, isLoading: txnsLoading } =
    useQuery<TransactionsResponse>({
      queryKey: ["bank-transactions", accountId, activeTab],
      queryFn: () => {
        const params: Record<string, string> = {
          bank_account_id: accountId,
        };
        if (activeTab === "reconciled") params.is_reconciled = "true";
        if (activeTab === "unreconciled") params.is_reconciled = "false";
        return api.get("/bank/transactions", params);
      },
    });

  const transactions = transactionsRes?.data ?? [];

  // Mutations
  const createTxnMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/bank/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-account"] });
      setShowAddTxnModal(false);
      setTxnForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        amount: "",
        type: "debit",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: { bank_account_id: string; rows: any[] }) =>
      api.post("/bank/transactions/import", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-account"] });
      setShowImportModal(false);
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: ({
      txnId,
      data,
    }: {
      txnId: string;
      data: Record<string, unknown>;
    }) => api.patch(`/bank/transactions/${txnId}/reconcile`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-summary"] });
      setShowReconcileModal(false);
      setSelectedTxn(null);
    },
  });

  const handleCreateTxn = () => {
    createTxnMutation.mutate({
      bank_account_id: accountId,
      date: txnForm.date,
      description: txnForm.description || undefined,
      reference: txnForm.reference || undefined,
      amount: Number(txnForm.amount),
      type: txnForm.type,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length > 0) {
        importMutation.mutate({
          bank_account_id: accountId,
          rows,
        });
      }
    };
    reader.readAsText(file);
  };

  const parseCsv = (
    text: string
  ): Array<{
    date: string;
    description?: string;
    debit?: number;
    credit?: number;
    balance?: number;
  }> => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/['"]/g, ""));
      if (values.length < headers.length) continue;

      const row: any = {};
      headers.forEach((header, idx) => {
        const val = values[idx];
        if (header.includes("date")) row.date = val;
        else if (header.includes("description") || header.includes("narration") || header.includes("particular"))
          row.description = val;
        else if (header.includes("debit") || header.includes("withdrawal"))
          row.debit = val ? parseFloat(val.replace(/,/g, "")) : undefined;
        else if (header.includes("credit") || header.includes("deposit"))
          row.credit = val ? parseFloat(val.replace(/,/g, "")) : undefined;
        else if (header.includes("balance"))
          row.balance = val ? parseFloat(val.replace(/,/g, "")) : undefined;
        else if (header.includes("reference") || header.includes("ref"))
          row.reference = val;
      });

      if (row.date && (row.debit || row.credit)) {
        rows.push(row);
      }
    }

    return rows;
  };

  const handleReconcile = () => {
    if (!selectedTxn) return;
    const data: Record<string, unknown> = {};
    if (reconcileForm.payment_id) data.payment_id = reconcileForm.payment_id;
    if (reconcileForm.invoice_id) data.invoice_id = reconcileForm.invoice_id;
    reconcileMutation.mutate({ txnId: selectedTxn.id, data });
  };

  const openReconcileModal = (txn: BankTransaction) => {
    setSelectedTxn(txn);
    setReconcileForm({ match_type: "", payment_id: "", invoice_id: "" });
    setShowReconcileModal(true);
  };

  const tabs = [
    { value: "all", label: "All Transactions" },
    { value: "unreconciled", label: "Unreconciled" },
    { value: "reconciled", label: "Reconciled" },
  ];

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
            {account?.account_name || "Bank Account"}
          </h1>
          <p className="text-sm text-gray-500">
            {account?.bank_name || ""}
            {account?.account_number
              ? ` | ****${account.account_number.toString().slice(-4)}`
              : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(Number(account?.current_balance ?? 0))}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<Upload className="h-4 w-4" />}
            onClick={() => setShowImportModal(true)}
          >
            Import CSV
          </Button>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddTxnModal(true)}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Transaction Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Reference
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Debit
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Credit
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Balance
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {txnsLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-700">
                      {formatDate(txn.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {txn.type === "debit" ? (
                          <ArrowUpRight className="h-4 w-4 text-danger-500 shrink-0" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-success-700 shrink-0" />
                        )}
                        <span className="text-gray-900">
                          {txn.description || "-"}
                        </span>
                        {txn.source === "import" && (
                          <Badge variant="outline">
                            <FileSpreadsheet className="h-3 w-3 mr-1" />
                            Import
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs font-mono">
                      {txn.reference || "-"}
                    </td>
                    <td className="py-3 px-4 text-right text-danger-600 font-medium">
                      {txn.type === "debit"
                        ? formatCurrency(Number(txn.amount))
                        : ""}
                    </td>
                    <td className="py-3 px-4 text-right text-success-700 font-medium">
                      {txn.type === "credit"
                        ? formatCurrency(Number(txn.amount))
                        : ""}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700 font-medium">
                      {txn.balance != null
                        ? formatCurrency(Number(txn.balance))
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {txn.is_reconciled ? (
                        <Badge variant="success" dot>
                          Reconciled
                        </Badge>
                      ) : txn.ai_suggestion ? (
                        <Badge variant="info" dot>
                          Suggested
                        </Badge>
                      ) : (
                        <Badge variant="warning" dot>
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!txn.is_reconciled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReconcileModal(txn)}
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Transaction Modal */}
      <Modal
        open={showAddTxnModal}
        onClose={() => setShowAddTxnModal(false)}
        title="Add Transaction"
        description="Manually record a bank transaction"
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={txnForm.date}
            onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })}
          />
          <Input
            label="Description"
            value={txnForm.description}
            onChange={(e) =>
              setTxnForm({ ...txnForm, description: e.target.value })
            }
            placeholder="e.g., Payment from XYZ Ltd"
          />
          <Input
            label="Reference"
            value={txnForm.reference}
            onChange={(e) =>
              setTxnForm({ ...txnForm, reference: e.target.value })
            }
            placeholder="e.g., UTR number"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              value={txnForm.amount}
              onChange={(e) =>
                setTxnForm({ ...txnForm, amount: e.target.value })
              }
              placeholder="0.00"
            />
            <Select
              label="Type"
              value={txnForm.type}
              onChange={(v) => setTxnForm({ ...txnForm, type: v })}
              options={[
                { value: "debit", label: "Debit (Money Out)" },
                { value: "credit", label: "Credit (Money In)" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddTxnModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTxn}
              loading={createTxnMutation.isPending}
              disabled={!txnForm.date || !txnForm.amount}
            >
              Add Transaction
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Bank Statement"
        description="Upload a CSV file with columns: Date, Description, Debit, Credit, Balance"
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <FileSpreadsheet className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              Drop your CSV file here or click to browse
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Supported columns: Date, Description/Narration, Debit/Withdrawal,
              Credit/Deposit, Balance, Reference
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              loading={importMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
          {importMutation.isSuccess && (
            <div className="p-3 bg-success-50 text-success-700 text-sm rounded-lg">
              Transactions imported successfully!
            </div>
          )}
          {importMutation.isError && (
            <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-lg">
              Failed to import:{" "}
              {(importMutation.error as Error)?.message || "Unknown error"}
            </div>
          )}
        </div>
      </Modal>

      {/* Reconcile Modal */}
      <Modal
        open={showReconcileModal}
        onClose={() => {
          setShowReconcileModal(false);
          setSelectedTxn(null);
        }}
        title="Reconcile Transaction"
        description={
          selectedTxn
            ? `Match "${selectedTxn.description || "Transaction"}" - ${formatCurrency(Number(selectedTxn.amount))} (${selectedTxn.type})`
            : ""
        }
      >
        <div className="space-y-4">
          <Select
            label="Match Type"
            value={reconcileForm.match_type}
            onChange={(v) =>
              setReconcileForm({
                ...reconcileForm,
                match_type: v,
                payment_id: "",
                invoice_id: "",
              })
            }
            options={[
              { value: "payment", label: "Match to Payment" },
              { value: "invoice", label: "Match to Invoice" },
              { value: "manual", label: "Mark as Reconciled (no match)" },
            ]}
            placeholder="Select match type"
          />

          {reconcileForm.match_type === "payment" && (
            <Input
              label="Payment ID"
              value={reconcileForm.payment_id}
              onChange={(e) =>
                setReconcileForm({
                  ...reconcileForm,
                  payment_id: e.target.value,
                })
              }
              placeholder="Enter payment ID"
              hint="Enter the payment record ID to link"
            />
          )}

          {reconcileForm.match_type === "invoice" && (
            <Input
              label="Invoice ID"
              value={reconcileForm.invoice_id}
              onChange={(e) =>
                setReconcileForm({
                  ...reconcileForm,
                  invoice_id: e.target.value,
                })
              }
              placeholder="Enter invoice ID"
              hint="Enter the invoice record ID to link"
            />
          )}

          {selectedTxn?.ai_suggestion && (
            <div className="p-3 bg-primary-50 rounded-lg">
              <p className="text-xs font-medium text-primary-800 mb-1">
                AI Suggestion
              </p>
              <p className="text-sm text-primary-700">
                Match to {selectedTxn.ai_suggestion.matched_to}:{" "}
                {selectedTxn.ai_suggestion.matched_id}
              </p>
              <p className="text-xs text-primary-600">
                Confidence: {selectedTxn.ai_suggestion.confidence}%
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowReconcileModal(false);
                setSelectedTxn(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReconcile}
              loading={reconcileMutation.isPending}
              disabled={!reconcileForm.match_type}
            >
              Reconcile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
