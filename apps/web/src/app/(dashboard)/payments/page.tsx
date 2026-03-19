"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  MoreHorizontal,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Loader2,
} from "lucide-react";

interface Payment {
  id: string;
  date: string;
  contact_name?: string;
  contact?: { name: string };
  invoice_number?: string;
  amount: number;
  method: string;
  type: "received" | "made";
  reference?: string | null;
}

interface ApiResponse<T> {
  data: T;
}

const methodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
};

const columnHelper = createColumnHelper<Payment>();

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formType, setFormType] = useState("received");
  const [formContactId, setFormContactId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formMethod, setFormMethod] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: payments = [], isLoading, error } = useQuery<Payment[]>({
    queryKey: ["payments", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.type = activeTab;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get<ApiResponse<Payment[]>>("/bill/payments", params);
      return res.data;
    },
  });

  // Fetch contacts for the dropdown
  const { data: contacts = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Array<{ id: string; name: string }>>>("/bill/contacts");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/bill/payments", {
        type: formType,
        contact_id: formContactId || undefined,
        amount: parseFloat(formAmount),
        date: formDate,
        method: formMethod,
        reference: formReference || undefined,
        notes: formNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setShowModal(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormType("received");
    setFormContactId("");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormMethod("");
    setFormReference("");
    setFormNotes("");
  };

  const totalReceived = payments
    .filter((p) => p.type === "received")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalMade = payments
    .filter((p) => p.type === "made")
    .reduce((sum, p) => sum + p.amount, 0);

  const tabs = [
    { value: "all", label: "All", count: payments.length },
    { value: "received", label: "Received", count: payments.filter((p) => p.type === "received").length },
    { value: "made", label: "Made", count: payments.filter((p) => p.type === "made").length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: "contact",
        header: "Contact",
        cell: (info) => (
          <span className="font-medium text-gray-900">
            {info.row.original.contact_name || info.row.original.contact?.name || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => {
          const row = info.row.original;
          return (
            <span
              className={`font-semibold ${
                row.type === "received"
                  ? "text-success-700"
                  : "text-warning-700"
              }`}
            >
              {row.type === "received" ? "+" : "-"}{" "}
              {formatCurrency(info.getValue())}
            </span>
          );
        },
      }),
      columnHelper.accessor("method", {
        header: "Mode",
        cell: (info) => (
          <Badge variant="default">
            {methodLabels[info.getValue()] || info.getValue() || "-"}
          </Badge>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => {
          const isReceived = info.getValue() === "received";
          return (
            <Badge variant={isReceived ? "success" : "warning"} dot>
              {isReceived ? "Received" : "Made"}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: () => (
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: payments,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track payments received and made
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/payments/outstanding">
            <Button
              variant="outline"
              size="sm"
              icon={<BarChart3 className="h-4 w-4" />}
            >
              Outstanding
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-success-50 flex items-center justify-center">
            <ArrowDownLeft className="h-6 w-6 text-success-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Received</p>
            <p className="text-xl font-bold text-success-700">
              {formatCurrency(totalReceived)}
            </p>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-warning-50 flex items-center justify-center">
            <ArrowUpRight className="h-6 w-6 text-warning-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Made</p>
            <p className="text-xl font-bold text-warning-700">
              {formatCurrency(totalMade)}
            </p>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Net Cash Flow</p>
            <p className="text-xl font-bold text-primary-800">
              {formatCurrency(totalReceived - totalMade)}
            </p>
          </div>
        </Card>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by contact or reference..."
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
            Failed to load payments. Please try again.
          </div>
        ) : (
          <DataTable table={table} />
        )}
      </Card>

      {/* Record Payment Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Record Payment"
        description="Record a payment received from a customer or made to a vendor"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Payment Type"
            options={[
              { value: "received", label: "Payment Received" },
              { value: "made", label: "Payment Made" },
            ]}
            value={formType}
            onChange={setFormType}
          />
          <Select
            label="Contact"
            options={contacts.map((c) => ({ value: c.id, label: c.name }))}
            value={formContactId}
            onChange={setFormContactId}
            searchable
            placeholder="Select contact"
          />
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
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!formAmount || !formMethod}
          >
            Record Payment
          </Button>
        </div>
      </Modal>
    </div>
  );
}
