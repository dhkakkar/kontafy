"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Search,
  FolderOpen,
  FileText,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  sub_type?: string | null;
  parent_id?: string | null;
  is_system: boolean;
  is_active: boolean;
  opening_balance: number;
  balance?: number;
  children?: Account[];
}

interface ApiResponse<T> {
  data: T;
}

const typeColors: Record<string, string> = {
  asset: "info",
  liability: "warning",
  equity: "default",
  income: "success",
  expense: "danger",
};

function AccountRow({
  account,
  level = 0,
}: {
  account: Account;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <>
      <tr
        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <td className="py-3 px-4">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <button className="h-5 w-5 flex items-center justify-center text-gray-400">
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            {hasChildren ? (
              <FolderOpen className="h-4 w-4 text-gray-400" />
            ) : (
              <FileText className="h-4 w-4 text-gray-300" />
            )}
            <span className="text-xs text-gray-400 font-mono">
              {account.code}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm ${
                hasChildren ? "font-semibold text-gray-900" : "text-gray-700"
              }`}
            >
              {account.name}
            </span>
            {account.is_system && (
              <span
                title="System account — cannot be deleted"
                className="text-gray-400"
              >
                <Lock className="h-3 w-3" />
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          {!hasChildren && (
            <Badge variant={typeColors[account.type] as "info" | "warning" | "default" | "success" | "danger"}>
              {account.type}
            </Badge>
          )}
        </td>
        <td className="py-3 px-4 text-right">
          <span
            className={`text-sm font-medium ${
              hasChildren ? "text-gray-900 font-semibold" : "text-gray-700"
            }`}
          >
            {formatCurrency(account.balance ?? account.opening_balance ?? 0)}
          </span>
        </td>
      </tr>
      {expanded &&
        account.children?.map((child) => (
          <AccountRow key={child.id} account={child} level={level + 1} />
        ))}
    </>
  );
}

// Suggest the next available 4-digit code in a given type's range, based on
// the codes already present in the org. The default chart uses 1xxx for
// assets, 2xxx liabilities, 3xxx equity, 4xxx income, 5xxx expense, so we
// look for the highest code in that band and return the next one.
function suggestNextCode(
  type: string,
  flatAccounts: { code: string }[],
): string {
  const bandStart: Record<string, number> = {
    asset: 1000,
    liability: 2000,
    equity: 3000,
    income: 4000,
    expense: 5000,
  };
  const start = bandStart[type];
  if (!start) return "";
  const end = start + 999;
  const inBand = flatAccounts
    .map((a) => parseInt(a.code, 10))
    .filter((n) => Number.isFinite(n) && n >= start && n <= end);
  const next = inBand.length === 0 ? start + 1 : Math.max(...inBand) + 1;
  return next > end ? "" : String(next);
}

export default function ChartOfAccountsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCode, setNewAccountCode] = useState("");
  const [newAccountType, setNewAccountType] = useState("");
  const [newAccountParent, setNewAccountParent] = useState("");
  // Field-level errors set by the create mutation's onError handler. Keyed
  // by field name (`code`, `name`, `parent_id`, `type`) so each input can
  // pull its own message. A generic error not tied to a field goes in
  // formError and is shown above the action buttons as a toast-style line.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const { data: accounts = [], isLoading, error } = useQuery<Account[]>({
    queryKey: ["accounts-tree"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Account[]>>("/books/accounts/tree");
      return res.data;
    },
  });

  // Flat list for parent account dropdown
  const { data: flatAccounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts-flat"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Account[]>>("/books/accounts");
      return res.data;
    },
  });

  const resetCreateForm = () => {
    setNewAccountName("");
    setNewAccountCode("");
    setNewAccountType("");
    setNewAccountParent("");
    setFieldErrors({});
    setFormError("");
  };

  const closeCreateModal = () => {
    setShowModal(false);
    resetCreateForm();
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/books/accounts", {
        name: newAccountName.trim(),
        code: newAccountCode.trim(),
        type: newAccountType,
        parent_id: newAccountParent || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-tree"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-flat"] });
      closeCreateModal();
    },
    onError: (err: any) => {
      // The API client attaches `field` (from error.details.field) and a
      // human message. If we know which field failed, render the error
      // inline under that input; otherwise surface it above the buttons.
      setFieldErrors({});
      const field = err?.field as string | undefined;
      const message = err?.message || "Failed to create account";
      if (field) {
        setFieldErrors({ [field]: message });
        setFormError("");
      } else {
        setFormError(message);
      }
    },
  });

  // Seed default chart from the empty state. The endpoint is idempotent —
  // if the org already has accounts it returns { created: 0 } and we just
  // refetch.
  const seedDefaultMutation = useMutation({
    mutationFn: async () =>
      api.post<{ data: { created: number } }>("/books/accounts/seed-default"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-tree"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-flat"] });
    },
  });

  // Filter accounts by search
  const filteredAccounts = searchQuery
    ? accounts.filter((a) => {
        const search = searchQuery.toLowerCase();
        const matchesAccount = (acc: Account): boolean => {
          if (acc.name.toLowerCase().includes(search) || acc.code.includes(search)) return true;
          return acc.children?.some(matchesAccount) ?? false;
        };
        return matchesAccount(a);
      })
    : accounts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Chart of Accounts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account structure
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowModal(true)}
        >
          Add Account
        </Button>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-danger-600">
            Failed to load chart of accounts. Please try again.
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary-800" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No accounts yet
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Get started with the built-in services chart of accounts — about
              70 pre-configured ledgers covering Assets, Liabilities, Equity,
              Income and Expenses. You can rename or add to anything afterwards.
            </p>
            {seedDefaultMutation.isError && (
              <p className="text-sm text-danger-600 mb-4">
                {(seedDefaultMutation.error as any)?.message ||
                  "Failed to seed default chart"}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button
                icon={<Sparkles className="h-4 w-4" />}
                onClick={() => seedDefaultMutation.mutate()}
                loading={seedDefaultMutation.isPending}
              >
                Load Default Template
              </Button>
              <Button
                variant="outline"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowModal(true)}
              >
                Start from Scratch
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Code
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Type
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <AccountRow key={account.id} account={account} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Account Modal */}
      <Modal
        open={showModal}
        onClose={closeCreateModal}
        title="Add New Account"
        description="Create a new account in your chart of accounts"
      >
        <div className="space-y-4">
          <Input
            label="Account Code *"
            value={newAccountCode}
            onChange={(e) => {
              setNewAccountCode(e.target.value);
              // Clear the per-field server error as soon as the user edits
              // the input, otherwise the message lingers after they've
              // already typed a fresh value.
              if (fieldErrors.code) {
                setFieldErrors((p) => ({ ...p, code: "" }));
              }
            }}
            placeholder={
              newAccountType
                ? `e.g., ${suggestNextCode(newAccountType, flatAccounts) || "1106"}`
                : "e.g., 1106"
            }
            error={
              fieldErrors.code ||
              // Live duplicate hint computed from the already-fetched flat
              // list — saves a round-trip and gives instant feedback as the
              // user types. The server still re-checks on submit.
              (newAccountCode.trim() &&
              flatAccounts.some(
                (a) => a.code === newAccountCode.trim(),
              )
                ? (() => {
                    const dup = flatAccounts.find(
                      (a) => a.code === newAccountCode.trim(),
                    );
                    return dup
                      ? `Code ${dup.code} is already used by "${dup.name}"`
                      : undefined;
                  })()
                : undefined) ||
              undefined
            }
          />
          <Input
            label="Account Name *"
            value={newAccountName}
            onChange={(e) => {
              setNewAccountName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((p) => ({ ...p, name: "" }));
              }
            }}
            placeholder="e.g., Prepaid Expenses"
            error={fieldErrors.name || undefined}
          />
          <div>
            <Select
              label="Account Type *"
              value={newAccountType}
              onChange={(v) => {
                setNewAccountType(v);
                // Auto-fill the code with the next available number in that
                // type's range, but only if the user hasn't already typed
                // a code — never overwrite their input.
                if (!newAccountCode.trim()) {
                  const suggested = suggestNextCode(v, flatAccounts);
                  if (suggested) setNewAccountCode(suggested);
                }
                if (fieldErrors.type) {
                  setFieldErrors((p) => ({ ...p, type: "" }));
                }
              }}
              options={[
                { value: "asset", label: "Asset (1xxx)" },
                { value: "liability", label: "Liability (2xxx)" },
                { value: "equity", label: "Equity (3xxx)" },
                { value: "income", label: "Income (4xxx)" },
                { value: "expense", label: "Expense (5xxx)" },
              ]}
              placeholder="Select type"
            />
            {fieldErrors.type && (
              <p className="mt-1 text-sm font-medium text-danger-600">
                {fieldErrors.type}
              </p>
            )}
          </div>
          <div>
            <Select
              label="Parent Account"
              value={newAccountParent}
              onChange={(v) => {
                setNewAccountParent(v);
                if (fieldErrors.parent_id) {
                  setFieldErrors((p) => ({ ...p, parent_id: "" }));
                }
              }}
              options={flatAccounts
                .filter(
                  (a) =>
                    (a.children && a.children.length > 0) || !a.parent_id,
                )
                .map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
              searchable
              placeholder="Select parent (optional)"
            />
            {fieldErrors.parent_id && (
              <p className="mt-1 text-sm font-medium text-danger-600">
                {fieldErrors.parent_id}
              </p>
            )}
          </div>
          {formError && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={
                !newAccountName.trim() ||
                !newAccountCode.trim() ||
                !newAccountType ||
                // Block submit while a live duplicate hint is showing —
                // server would reject it anyway, but skipping the round-trip
                // is faster.
                flatAccounts.some(
                  (a) => a.code === newAccountCode.trim(),
                )
              }
            >
              Create Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
