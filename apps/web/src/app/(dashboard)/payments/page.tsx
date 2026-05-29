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
import { BankCashAccountSelect } from "@/components/payments/BankCashAccountSelect";
import { getPaymentModeUi } from "@/components/payments/paymentModeFields";

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
  // Bank account state — required when method != cash. For cash mode
  // we leave this null and the backend falls back to ledger 1101.
  const [formBankAccountId, setFormBankAccountId] = useState<string | null>(null);
  // Bill-against-payment selection. Holds either an invoice id or the
  // literal "__advance__" sentinel for "no specific bill / on account".
  // Defaulting to "" means "user hasn't picked yet" — distinct from
  // explicit advance because we want to nudge them to make a choice.
  const [formAgainstBillId, setFormAgainstBillId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Mode-driven UI hints (bank picker visibility + reference label).
  // Same shape used by the invoice-scoped record-payment pages.
  const formModeUi = getPaymentModeUi(formMethod);

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

  // Fetch contacts for the dropdown — filtered to the side that
  // makes sense for the chosen payment type. Received → customers and
  // both; Made → vendors and both. Without this filter a user
  // recording a vendor payment would see all customers too.
  const { data: allContacts = [] } = useQuery<
    Array<{ id: string; name: string; type: string }>
  >({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const res = await api.get<
        ApiResponse<Array<{ id: string; name: string; type: string }>>
      >("/bill/contacts", { limit: "500" });
      return res.data;
    },
  });

  const contacts = useMemo(() => {
    const want = formType === "made" ? "vendor" : "customer";
    return allContacts.filter((c) => c.type === want || c.type === "both");
  }, [allContacts, formType]);

  // Fetch the selected contact's outstanding invoices/bills as soon
  // as a contact is picked — the "Against Bill" dropdown's options
  // come from here, FIFO-sorted by the backend so the user lands on
  // the oldest unpaid bill first if they accept the suggestion.
  const { data: outstandingBills = [], isFetching: outstandingLoading } =
    useQuery<
      Array<{
        id: string;
        invoice_number: string;
        date: string;
        total: number;
        balance_due: number;
      }>
    >({
      queryKey: [
        "payment-outstanding-modal",
        formContactId,
        formType === "made" ? "pay" : "receive",
      ],
      enabled: !!formContactId,
      queryFn: async () => {
        const direction = formType === "made" ? "pay" : "receive";
        const raw = (await api.get(
          `/bill/payments/outstanding/contact/${formContactId}`,
          { direction },
        )) as any;
        // Endpoint returns { data: [...], meta } which becomes
        // { success, data, meta } through the ResponseInterceptor.
        const list = raw?.data && Array.isArray(raw.data) ? raw.data : raw?.data?.data || [];
        return list;
      },
    });

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(formAmount);
      // Resolve the "Against Bill" choice into the API's allocations
      // array shape. A specific invoice becomes a 1-row allocation;
      // "__advance__" leaves the allocations empty so the backend
      // posts the whole thing to 2116 / 1112. The submit button is
      // disabled until one is chosen.
      //
      // Overpay handling: if the user picked a specific bill but
      // edited the amount to be larger than the bill's balance,
      // clamp the allocation to balance_due and let the remainder
      // flow to advance — otherwise the backend would throw a hard
      // "Allocation exceeds balance" error and reject the whole
      // payment, which is a worse UX than the user expects.
      let allocations: Array<{ invoice_id: string; amount: number }> = [];
      if (formAgainstBillId && formAgainstBillId !== "__advance__") {
        const bill = outstandingBills.find(
          (b) => b.id === formAgainstBillId,
        );
        const allocAmount = bill
          ? Math.min(amount, bill.balance_due)
          : amount;
        allocations = [{ invoice_id: formAgainstBillId, amount: allocAmount }];
      }
      return api.post("/bill/payments", {
        type: formType,
        contact_id: formContactId || undefined,
        amount,
        date: formDate,
        method: formMethod,
        reference: formReference || undefined,
        notes: formNotes || undefined,
        bank_account_id: formModeUi.isCash ? null : formBankAccountId,
        allocations,
      });
    },
    onSuccess: () => {
      // Invalidate every cache that surfaces payment / invoice data
      // so the next visited page shows fresh numbers (the global
      // staleTime: 60s would otherwise hide the change). Detail
      // pages (`["invoice", id]` / `["purchase", id]`) need broad
      // invalidation too — without it the user navigates to the
      // affected invoice and sees the old balance_due.
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
      queryClient.invalidateQueries({ queryKey: ["purchase"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchases-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment-outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["payment-outstanding-modal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to record payment");
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
    setFormBankAccountId(null);
    setFormAgainstBillId("");
    setFormError(null);
  };

  // When the user switches payment type, the previously-selected
  // contact may no longer belong to the right side (e.g. they picked
  // a customer then switched to "Made"). Reset both contact and
  // bill picks so the cascading dropdowns stay consistent.
  React.useEffect(() => {
    setFormContactId("");
    setFormAgainstBillId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType]);

  // Picking a bill auto-fills the amount to that bill's balance_due
  // — the Tally-style data-entry flow the user asked for. The
  // "__advance__" choice leaves the amount alone so the user can
  // type a free-form advance figure.
  React.useEffect(() => {
    if (!formAgainstBillId || formAgainstBillId === "__advance__") return;
    const bill = outstandingBills.find((b) => b.id === formAgainstBillId);
    if (bill && bill.balance_due > 0) {
      setFormAmount(String(bill.balance_due));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formAgainstBillId]);

  // Changing contact mid-flow invalidates whichever bill was picked —
  // it belonged to a different contact. Clear the bill pick AND the
  // amount, since the amount was auto-filled from the old bill's
  // balance_due and would otherwise carry over to the new contact
  // as a misleading default (₹41,300 against a vendor who has no
  // bill anywhere near that figure).
  React.useEffect(() => {
    setFormAgainstBillId("");
    setFormAmount("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formContactId]);

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
                {formType === "made" ? "Vendor" : "Customer"}
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
              placeholder={
                formType === "made" ? "Select vendor" : "Select customer"
              }
            />
          </div>

          {/* Against Bill / Invoice — appears as soon as the contact is
              picked. Single-bill in this lite modal (full multi-bill
              allocation lives on the invoice-scoped record-payment
              pages). Auto-fills the Amount field when a bill is chosen
              so the most common path (full settlement of one bill) is
              one click. */}
          {formContactId && (
            <div className="md:col-span-2">
              <Select
                label={
                  formType === "made"
                    ? "Against Bill"
                    : "Against Invoice"
                }
                options={[
                  ...outstandingBills.map((b) => ({
                    value: b.id,
                    label: `${b.invoice_number} — ${formatCurrency(b.balance_due)} due`,
                  })),
                  // "On Account" sentinel — backend leaves allocations
                  // empty and books the full amount to the advance
                  // ledger (2116 for customers, 1112 for vendors).
                  {
                    value: "__advance__",
                    label: outstandingBills.length
                      ? `— On Account / Advance (no specific ${formType === "made" ? "bill" : "invoice"}) —`
                      : `No outstanding ${formType === "made" ? "bills" : "invoices"} — record as Advance`,
                  },
                ]}
                value={formAgainstBillId}
                onChange={setFormAgainstBillId}
                placeholder={
                  outstandingLoading
                    ? "Loading outstanding…"
                    : `Select ${formType === "made" ? "bill" : "invoice"} to settle`
                }
                searchable
              />
              {formAgainstBillId === "__advance__" && (
                <p className="text-xs text-amber-700 mt-1">
                  This will be recorded as an{" "}
                  {formType === "made"
                    ? "Advance to Vendor (1112)"
                    : "Advance from Customer (2116)"}{" "}
                  in the books.
                </p>
              )}
            </div>
          )}

          <Input
            label="Amount"
            type="number"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            placeholder="0.00"
            hint={
              formAgainstBillId && formAgainstBillId !== "__advance__"
                ? "Auto-filled from bill — edit to record a partial payment"
                : undefined
            }
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
            onChange={(v) => {
              setFormMethod(v);
              // Clear stale bank selection when switching to cash so
              // a previously-picked bank doesn't leak into the cash JE.
              if (v === "cash") setFormBankAccountId(null);
            }}
            placeholder="Select mode"
          />
          {/* Bank picker is only meaningful for non-cash modes — cash
              auto-routes to ledger 1101. */}
          {formModeUi.showBankPicker ? (
            <div>
              <BankCashAccountSelect
                value={formBankAccountId}
                onChange={(next) => setFormBankAccountId(next.bankAccountId)}
              />
              {formModeUi.bankHint && (
                <p className="text-xs text-gray-500 mt-1">
                  {formModeUi.bankHint}
                </p>
              )}
            </div>
          ) : (
            // Reserve the grid column so the layout stays stable when
            // the user toggles to cash — otherwise the Method dropdown
            // jumps to the centre on its own row.
            <div className="hidden md:block" />
          )}
          <Input
            label={formModeUi.referenceLabel}
            value={formReference}
            onChange={(e) => setFormReference(e.target.value)}
            placeholder={formModeUi.referencePlaceholder}
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
        {formError && (
          <div className="mt-4 p-3 bg-danger-50 text-danger-700 text-sm rounded-lg">
            {formError}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setFormError(null);
              if (!formContactId) {
                setFormError(
                  `Please select a ${formType === "made" ? "vendor" : "customer"}.`,
                );
                return;
              }
              if (!formAgainstBillId) {
                setFormError(
                  `Please pick which ${formType === "made" ? "bill" : "invoice"} this payment is against (or choose On Account).`,
                );
                return;
              }
              if (!formModeUi.isCash && !formBankAccountId) {
                setFormError(
                  "Please select a bank account for this payment mode.",
                );
                return;
              }
              createMutation.mutate();
            }}
            loading={createMutation.isPending}
            disabled={
              !formAmount ||
              !formMethod ||
              !formContactId ||
              !formAgainstBillId ||
              (!formModeUi.isCash && !formBankAccountId)
            }
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
