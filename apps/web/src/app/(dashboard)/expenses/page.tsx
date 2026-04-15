"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Plus,
  Search,
  Download,
  Loader2,
  IndianRupee,
  Calendar,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  reference?: string;
  vendor_name?: string;
  status: "pending" | "approved" | "paid" | "rejected";
}

interface ApiResponse<T> {
  data: T;
}

interface CreateExpensePayload {
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  reference?: string;
  vendor_name?: string;
  notes?: string;
}

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  pending: { variant: "warning", label: "Pending" },
  approved: { variant: "info", label: "Approved" },
  paid: { variant: "success", label: "Paid" },
  rejected: { variant: "danger", label: "Rejected" },
};

const categoryOptions = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "salaries", label: "Salaries" },
  { value: "travel", label: "Travel" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "professional_fees", label: "Professional Fees" },
  { value: "marketing", label: "Marketing" },
  { value: "insurance", label: "Insurance" },
  { value: "repairs", label: "Repairs" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

const categoryLabelMap: Record<string, string> = Object.fromEntries(
  categoryOptions.map((o) => [o.value, o.label])
);

const paymentMethodLabelMap: Record<string, string> = Object.fromEntries(
  paymentMethodOptions.map((o) => [o.value, o.label])
);

const columnHelper = createColumnHelper<Expense>();

const initialFormState: CreateExpensePayload = {
  date: new Date().toISOString().split("T")[0],
  category: "",
  description: "",
  amount: 0,
  payment_method: "",
  reference: "",
  vendor_name: "",
  notes: "",
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateExpensePayload>({ ...initialFormState });

  const { data: expenses = [], isLoading, error } = useQuery<Expense[]>({
    queryKey: ["expenses", activeTab, searchQuery, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.status = activeTab;
      if (searchQuery) params.search = searchQuery;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const res = await api.get<ApiResponse<Expense[]>>("/bill/expenses", params);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateExpensePayload) =>
      api.post<ApiResponse<Expense>>("/bill/expenses", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowCreateModal(false);
      setForm({ ...initialFormState });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Expense["status"] }) =>
      api.patch(`/bill/expenses/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bill/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateExpensePayload = {
      date: form.date,
      category: form.category,
      description: form.description,
      amount: form.amount,
      payment_method: form.payment_method,
    };
    if (form.reference) payload.reference = form.reference;
    if (form.vendor_name) payload.vendor_name = form.vendor_name;
    if (form.notes) payload.notes = form.notes;
    createMutation.mutate(payload);
  };

  const updateField = <K extends keyof CreateExpensePayload>(
    key: K,
    value: CreateExpensePayload[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Summary calculations
  const now = new Date();
  const thisMonthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const pendingCount = expenses.filter((e) => e.status === "pending").length;

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const largestCategory = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const tabs = [
    { value: "all", label: "All", count: expenses.length },
    {
      value: "pending",
      label: "Pending",
      count: expenses.filter((e) => e.status === "pending").length,
    },
    {
      value: "approved",
      label: "Approved",
      count: expenses.filter((e) => e.status === "approved").length,
    },
    {
      value: "paid",
      label: "Paid",
      count: expenses.filter((e) => e.status === "paid").length,
    },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className="font-medium text-gray-900">
            {categoryLabelMap[info.getValue()] || info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => (
          <span className="text-gray-700 max-w-[200px] truncate block">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("vendor_name", {
        header: "Vendor",
        cell: (info) => (
          <span className="text-gray-600">{info.getValue() || "-"}</span>
        ),
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("payment_method", {
        header: "Method",
        cell: (info) => (
          <span className="text-gray-600">
            {paymentMethodLabelMap[info.getValue()] || info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const s = statusBadgeMap[info.getValue()] || statusBadgeMap.pending;
          return (
            <Badge variant={s.variant} dot>
              {s.label}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => {
          const row = info.row.original;
          const items = [];
          if (row.status === "pending") {
            items.push({
              label: "Approve",
              icon: <CheckCircle2 className="h-4 w-4" />,
              onClick: () =>
                updateStatusMutation.mutate({ id: row.id, status: "approved" }),
            });
            items.push({
              label: "Reject",
              icon: <XCircle className="h-4 w-4" />,
              onClick: () =>
                updateStatusMutation.mutate({ id: row.id, status: "rejected" }),
            });
          }
          if (row.status === "approved") {
            items.push({
              label: "Mark Paid",
              icon: <CheckCircle2 className="h-4 w-4" />,
              onClick: () =>
                updateStatusMutation.mutate({ id: row.id, status: "paid" }),
            });
          }
          items.push({
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: () => {
              if (
                !confirm(
                  `Delete this expense of ${formatCurrency(row.amount)}?`,
                )
              )
                return;
              deleteMutation.mutate(row.id);
            },
          });
          return <ActionMenu items={items} />;
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data: expenses,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const isFormValid =
    form.date && form.category && form.description && form.amount > 0 && form.payment_method;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage your business expenses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            New Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <IndianRupee className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Expenses (This Month)</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(totalThisMonth)}
            </p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-warning-50 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-warning-700" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="text-xl font-bold text-warning-700">
              {pendingCount}
            </p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-success-700" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Largest Category</p>
            <p className="text-xl font-bold text-gray-900">
              {largestCategory
                ? categoryLabelMap[largestCategory[0]] || largestCategory[0]
                : "-"}
            </p>
            {largestCategory && (
              <p className="text-xs text-gray-500">
                {formatCurrency(largestCategory[1])}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Table Card */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="w-40"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="w-40"
          />
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-danger-600">
            Failed to load expenses. Please try again.
          </div>
        ) : (
          <DataTable table={table} />
        )}
      </Card>

      {/* Create Expense Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setForm({ ...initialFormState });
          createMutation.reset();
        }}
        title="New Expense"
        description="Record a new business expense"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => updateField("date", e.target.value)}
              required
            />
            <Select
              label="Category"
              options={categoryOptions}
              value={form.category}
              onChange={(val) => updateField("category", val)}
              placeholder="Select category..."
            />
          </div>

          <Input
            label="Description"
            placeholder="Brief description of the expense"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              placeholder="0.00"
              value={form.amount || ""}
              onChange={(e) => updateField("amount", parseFloat(e.target.value) || 0)}
              required
            />
            <Select
              label="Payment Method"
              options={paymentMethodOptions}
              value={form.payment_method}
              onChange={(val) => updateField("payment_method", val)}
              placeholder="Select method..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Reference"
              placeholder="Transaction ID, cheque no., etc."
              value={form.reference || ""}
              onChange={(e) => updateField("reference", e.target.value)}
            />
            <Input
              label="Vendor Name"
              placeholder="Vendor or payee name"
              value={form.vendor_name || ""}
              onChange={(e) => updateField("vendor_name", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              className="w-full h-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              placeholder="Additional notes (optional)"
              value={form.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>

          {createMutation.isError && (
            <p className="text-sm text-danger-600">
              {(createMutation.error as Error)?.message || "Failed to create expense"}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setForm({ ...initialFormState });
                createMutation.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || createMutation.isPending}
              icon={
                createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Expense"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
