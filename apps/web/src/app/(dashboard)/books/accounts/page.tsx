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
          <span
            className={`text-sm ${
              hasChildren ? "font-semibold text-gray-900" : "text-gray-700"
            }`}
          >
            {account.name}
          </span>
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

export default function ChartOfAccountsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCode, setNewAccountCode] = useState("");
  const [newAccountType, setNewAccountType] = useState("");
  const [newAccountParent, setNewAccountParent] = useState("");

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

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/books/accounts", {
        name: newAccountName,
        code: newAccountCode,
        type: newAccountType,
        parent_id: newAccountParent || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-tree"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-flat"] });
      setShowModal(false);
      setNewAccountName("");
      setNewAccountCode("");
      setNewAccountType("");
      setNewAccountParent("");
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
        onClose={() => setShowModal(false)}
        title="Add New Account"
        description="Create a new account in your chart of accounts"
      >
        <div className="space-y-4">
          <Input
            label="Account Code"
            value={newAccountCode}
            onChange={(e) => setNewAccountCode(e.target.value)}
            placeholder="e.g., 1106"
          />
          <Input
            label="Account Name"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="e.g., Prepaid Expenses"
          />
          <Select
            label="Account Type"
            value={newAccountType}
            onChange={setNewAccountType}
            options={[
              { value: "asset", label: "Asset" },
              { value: "liability", label: "Liability" },
              { value: "equity", label: "Equity" },
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
            ]}
            placeholder="Select type"
          />
          <Select
            label="Parent Account"
            value={newAccountParent}
            onChange={setNewAccountParent}
            options={flatAccounts
              .filter((a) => a.children && a.children.length > 0 || !a.parent_id)
              .map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
            searchable
            placeholder="Select parent (optional)"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!newAccountName || !newAccountCode || !newAccountType}
            >
              Create Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
