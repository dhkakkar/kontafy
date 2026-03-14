"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Search,
  FolderOpen,
  FileText,
} from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  children?: Account[];
}

const chartOfAccounts: Account[] = [
  {
    id: "1",
    code: "1000",
    name: "Assets",
    type: "group",
    balance: 2450000,
    children: [
      {
        id: "1-1",
        code: "1100",
        name: "Current Assets",
        type: "group",
        balance: 1850000,
        children: [
          {
            id: "1-1-1",
            code: "1101",
            name: "Cash in Hand",
            type: "asset",
            balance: 125000,
          },
          {
            id: "1-1-2",
            code: "1102",
            name: "Bank Account - HDFC",
            type: "asset",
            balance: 890000,
          },
          {
            id: "1-1-3",
            code: "1103",
            name: "Accounts Receivable",
            type: "asset",
            balance: 285000,
          },
          {
            id: "1-1-4",
            code: "1104",
            name: "GST Input Credit",
            type: "asset",
            balance: 48000,
          },
          {
            id: "1-1-5",
            code: "1105",
            name: "Inventory",
            type: "asset",
            balance: 502000,
          },
        ],
      },
      {
        id: "1-2",
        code: "1200",
        name: "Fixed Assets",
        type: "group",
        balance: 600000,
        children: [
          {
            id: "1-2-1",
            code: "1201",
            name: "Office Equipment",
            type: "asset",
            balance: 250000,
          },
          {
            id: "1-2-2",
            code: "1202",
            name: "Furniture & Fixtures",
            type: "asset",
            balance: 350000,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    code: "2000",
    name: "Liabilities",
    type: "group",
    balance: 680000,
    children: [
      {
        id: "2-1",
        code: "2100",
        name: "Current Liabilities",
        type: "group",
        balance: 680000,
        children: [
          {
            id: "2-1-1",
            code: "2101",
            name: "Accounts Payable",
            type: "liability",
            balance: 142000,
          },
          {
            id: "2-1-2",
            code: "2102",
            name: "GST Payable",
            type: "liability",
            balance: 48600,
          },
          {
            id: "2-1-3",
            code: "2103",
            name: "TDS Payable",
            type: "liability",
            balance: 15400,
          },
          {
            id: "2-1-4",
            code: "2104",
            name: "Salary Payable",
            type: "liability",
            balance: 474000,
          },
        ],
      },
    ],
  },
  {
    id: "3",
    code: "3000",
    name: "Equity",
    type: "group",
    balance: 1770000,
    children: [
      {
        id: "3-1",
        code: "3001",
        name: "Owner's Capital",
        type: "equity",
        balance: 1500000,
      },
      {
        id: "3-2",
        code: "3002",
        name: "Retained Earnings",
        type: "equity",
        balance: 270000,
      },
    ],
  },
  {
    id: "4",
    code: "4000",
    name: "Income",
    type: "group",
    balance: 5500000,
    children: [
      {
        id: "4-1",
        code: "4001",
        name: "Sales Revenue",
        type: "income",
        balance: 5200000,
      },
      {
        id: "4-2",
        code: "4002",
        name: "Service Revenue",
        type: "income",
        balance: 280000,
      },
      {
        id: "4-3",
        code: "4003",
        name: "Interest Income",
        type: "income",
        balance: 20000,
      },
    ],
  },
  {
    id: "5",
    code: "5000",
    name: "Expenses",
    type: "group",
    balance: 3100000,
    children: [
      {
        id: "5-1",
        code: "5001",
        name: "Cost of Goods Sold",
        type: "expense",
        balance: 1800000,
      },
      {
        id: "5-2",
        code: "5002",
        name: "Salaries & Wages",
        type: "expense",
        balance: 720000,
      },
      {
        id: "5-3",
        code: "5003",
        name: "Rent Expense",
        type: "expense",
        balance: 270000,
      },
      {
        id: "5-4",
        code: "5004",
        name: "Utilities",
        type: "expense",
        balance: 45000,
      },
      {
        id: "5-5",
        code: "5005",
        name: "Marketing & Advertising",
        type: "expense",
        balance: 180000,
      },
      {
        id: "5-6",
        code: "5006",
        name: "Office Supplies",
        type: "expense",
        balance: 85000,
      },
    ],
  },
];

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
  const isGroup = account.type === "group";

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
            {isGroup ? (
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
              isGroup ? "font-semibold text-gray-900" : "text-gray-700"
            }`}
          >
            {account.name}
          </span>
        </td>
        <td className="py-3 px-4">
          {!isGroup && (
            <Badge variant={typeColors[account.type] as "info" | "warning" | "default" | "success" | "danger"}>
              {account.type}
            </Badge>
          )}
        </td>
        <td className="py-3 px-4 text-right">
          <span
            className={`text-sm font-medium ${
              isGroup ? "text-gray-900 font-semibold" : "text-gray-700"
            }`}
          >
            {formatCurrency(account.balance)}
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
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCode, setNewAccountCode] = useState("");
  const [newAccountType, setNewAccountType] = useState("");

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
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {/* Table */}
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
              {chartOfAccounts.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
            </tbody>
          </table>
        </div>
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
            value=""
            onChange={() => {}}
            options={[
              { value: "1100", label: "1100 - Current Assets" },
              { value: "1200", label: "1200 - Fixed Assets" },
              { value: "2100", label: "2100 - Current Liabilities" },
              { value: "3000", label: "3000 - Equity" },
              { value: "4000", label: "4000 - Income" },
              { value: "5000", label: "5000 - Expenses" },
            ]}
            searchable
            placeholder="Select parent (optional)"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button>Create Account</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
