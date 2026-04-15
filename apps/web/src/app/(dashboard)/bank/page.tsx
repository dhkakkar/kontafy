"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Building2,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
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
  is_active: boolean;
}

interface ReconciliationSummary {
  total_transactions: number;
  reconciled_count: number;
  unreconciled_count: number;
  reconciled_pct: number;
  reconciled_net_amount: number;
  unreconciled_net_amount: number;
}

export default function BankDashboardPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    account_name: "",
    bank_name: "",
    account_number: "",
    ifsc: "",
    account_type: "",
    opening_balance: "",
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<
    BankAccount[]
  >({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const res = await api.get<{ data: BankAccount[] }>("/bank/accounts");
      return res.data;
    },
  });

  const { data: summary } = useQuery<ReconciliationSummary>({
    queryKey: ["reconciliation-summary"],
    queryFn: async () => {
      const res = await api.get<{ data: ReconciliationSummary }>("/bank/reconciliation/summary");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<{ data: unknown }>("/bank/accounts", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setShowAddModal(false);
      setForm({
        account_name: "",
        bank_name: "",
        account_number: "",
        ifsc: "",
        account_type: "",
        opening_balance: "",
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      account_name: form.account_name,
      bank_name: form.bank_name || undefined,
      account_number: form.account_number || undefined,
      ifsc: form.ifsc || undefined,
      account_type: form.account_type || undefined,
      opening_balance: form.opening_balance ? Number(form.opening_balance) : 0,
    });
  };

  const totalBalance = accounts.reduce(
    (sum, a) => sum + Number(a.current_balance),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank & Cash</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage bank accounts and reconcile transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/bank/reconciliation">
            <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />}>
              Reconciliation
            </Button>
          </Link>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddModal(true)}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary-800" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Reconciled</p>
              <p className="text-xl font-bold text-gray-900">
                {summary?.reconciled_pct ?? 0}%
              </p>
              <p className="text-xs text-gray-400">
                {summary?.reconciled_count ?? 0} of{" "}
                {summary?.total_transactions ?? 0} transactions
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning-50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-warning-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unreconciled</p>
              <p className="text-xl font-bold text-gray-900">
                {summary?.unreconciled_count ?? 0}
              </p>
              <p className="text-xs text-gray-400">transactions pending</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bank Account Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Bank Accounts
        </h2>

        {accountsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-24 bg-gray-100 rounded" />
              </Card>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <Card className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No bank accounts yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Add your first bank account to start tracking transactions
            </p>
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddModal(true)}
            >
              Add Bank Account
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Link
                key={account.id}
                href={`/bank/accounts/${account.id}`}
              >
                <Card hover className="cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary-800" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {account.account_name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {account.bank_name || "Cash Account"}
                        </p>
                      </div>
                    </div>
                    {!account.is_active && (
                      <Badge variant="default">Inactive</Badge>
                    )}
                  </div>

                  {account.account_number && (
                    <p className="text-xs text-gray-400 mb-2 font-mono">
                      ****{account.account_number.slice(-4)}
                      {account.ifsc ? ` | ${account.ifsc}` : ""}
                    </p>
                  )}

                  <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Current Balance</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(Number(account.current_balance))}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Bank Account"
        description="Add a new bank or cash account"
      >
        <div className="space-y-4">
          <Input
            label="Account Name"
            value={form.account_name}
            onChange={(e) =>
              setForm({ ...form, account_name: e.target.value })
            }
            placeholder="e.g., HDFC Current Account"
          />
          <Input
            label="Bank Name"
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            placeholder="e.g., HDFC Bank"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Account Number"
              value={form.account_number}
              onChange={(e) =>
                setForm({ ...form, account_number: e.target.value })
              }
              placeholder="e.g., 50100123456789"
            />
            <Input
              label="IFSC Code"
              value={form.ifsc}
              onChange={(e) =>
                setForm({ ...form, ifsc: e.target.value.toUpperCase() })
              }
              placeholder="e.g., HDFC0001234"
            />
          </div>
          <Select
            label="Account Type"
            value={form.account_type}
            onChange={(v) => setForm({ ...form, account_type: v })}
            options={[
              { value: "current", label: "Current Account" },
              { value: "savings", label: "Savings Account" },
              { value: "credit_card", label: "Credit Card" },
              { value: "cash", label: "Cash" },
              { value: "overdraft", label: "Overdraft" },
            ]}
            placeholder="Select type"
          />
          <Input
            label="Opening Balance"
            type="number"
            value={form.opening_balance}
            onChange={(e) =>
              setForm({ ...form, opening_balance: e.target.value })
            }
            placeholder="0.00"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!form.account_name}
            >
              Add Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
