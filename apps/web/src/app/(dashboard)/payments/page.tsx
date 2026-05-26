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
  Eye,
  Trash2,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Loader2,
} from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";

interface Payment {
  id: string;
  date: string;
  contact_name?: string;
  contact?: { name: string };
  invoice_number?: string;
  amount: number;
  method: string;
  // Backend stores "received" / "paid" but legacy rows used "receive" / "pay";
  // "made" is the UI tab label, never a DB value.
  type: "received" | "receive" | "paid" | "pay" | "made";
  reference?: string | null;
}

const isReceivedType = (t: string) => t === "received" || t === "receive";
const isMadeType = (t: string) => t === "paid" || t === "pay" || t === "made";

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
  const router = useRouter();
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

  // Inline "Add new contact" modal so users don't have to leave the
  // Record Payment flow to create a missing customer/vendor.
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactType, setNewContactType] = useState("customer");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

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

  const createContactMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{ id: string; name: string }>>(
        "/bill/contacts",
        {
          name: newContactName,
          type: newContactType,
          phone: newContactPhone || undefined,
          email: newContactEmail || undefined,
        },
      );
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["contacts-list"] });
      // Auto-select the newly created contact so the user can carry on
      // recording the payment without re-opening the dropdown.
      if (created?.id) setFormContactId(created.id);
      setShowAddContact(false);
      setNewContactName("");
      setNewContactType("customer");
      setNewContactPhone("");
      setNewContactEmail("");
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

  // Amounts come back from the API as Decimal-serialised strings; coerce
  // before reducing or `sum + p.amount` concatenates ("0" + "9000" + ...)
  // and totals show as 90,00,90,00,20,000 instead of 38,000.
  const totalReceived = payments
    .filter((p) => isReceivedType(p.type))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalMade = payments
    .filter((p) => isMadeType(p.type))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const tabs = [
    { value: "all", label: "All", count: payments.length },
    { value: "received", label: "Received", count: payments.filter((p) => isReceivedType(p.type)).length },
    { value: "made", label: "Made", count: payments.filter((p) => isMadeType(p.type)).length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <Link
            href={`/payments/${info.row.original.id}`}
            className="text-primary-800 hover:underline"
          >
            {formatDate(info.getValue())}
          </Link>
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
                isReceivedType(row.type)
                  ? "text-success-700"
                  : "text-warning-700"
              }`}
            >
              {isReceivedType(row.type) ? "+" : "-"}{" "}
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
        cell: (info) => (
          <ActionMenu
            items={[
              {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onClick: () =>
                  router.push(`/payments/${info.row.original.id}`),
              },
              {
                label: "Delete",
                icon: <Trash2 className="h-4 w-4" />,
                danger: true,
                onClick: async () => {
                  const row = info.row.original;
                  if (!confirm(`Delete this payment of ${formatCurrency(row.amount)}?`))
                    return;
                  try {
                    await api.delete(`/bill/payments/${row.id}`);
                    queryClient.invalidateQueries({ queryKey: ["payments"] });
                  } catch (err) {
                    alert((err as Error).message || "Failed to delete payment");
                  }
                },
              },
            ]}
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Contact
              </label>
              <button
                type="button"
                onClick={() => {
                  // Default the new contact's type to match the payment
                  // direction (received → customer, made → vendor).
                  setNewContactType(formType === "made" ? "vendor" : "customer");
                  setShowAddContact(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Add new
              </button>
            </div>
            <Select
              options={contacts.map((c) => ({ value: c.id, label: c.name }))}
              value={formContactId}
              onChange={setFormContactId}
              searchable
              placeholder="Select contact"
            />
          </div>
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

      {/* Inline create-contact modal opened from the Record Payment form */}
      <Modal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        title="Add New Contact"
        description="Create a customer or vendor without leaving this payment"
        size="md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Name"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="Contact name"
            />
          </div>
          <Select
            label="Type"
            options={[
              { value: "customer", label: "Customer" },
              { value: "vendor", label: "Vendor" },
            ]}
            value={newContactType}
            onChange={setNewContactType}
          />
          <Input
            label="Phone"
            value={newContactPhone}
            onChange={(e) => setNewContactPhone(e.target.value)}
            placeholder="Optional"
          />
          <div className="md:col-span-2">
            <Input
              label="Email"
              type="email"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowAddContact(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createContactMutation.mutate()}
            loading={createContactMutation.isPending}
            disabled={!newContactName.trim()}
          >
            Save Contact
          </Button>
        </div>
      </Modal>
    </div>
  );
}
