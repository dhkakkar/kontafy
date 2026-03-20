"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit3,
  Plus,
  CreditCard,
  Mail,
  Phone,
  Building2,
  MapPin,
  IndianRupee,
  FileText,
  Calendar,
  Clock,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
}

interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface Contact {
  id: string;
  name: string;
  company_name: string | null;
  type: string;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  billing_address: Address;
  shipping_address: Address;
  payment_terms: number;
  credit_limit: number | null;
  opening_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface ContactSummary {
  total_revenue: number;
  total_outstanding: number;
  total_invoices: number;
  last_transaction_date: string | null;
}

interface Transaction {
  id: string;
  transaction_type: "invoice" | "payment";
  number?: string;
  type: string;
  status?: string;
  date: string;
  due_date?: string | null;
  amount: number;
  balance_due?: number;
  method?: string;
  reference?: string;
}

interface OutstandingInvoice {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  date: string;
  due_date: string | null;
  total: number;
  balance_due: number;
  amount_paid: number;
  days_past_due: number;
  aging_bucket: string;
}

interface OutstandingData {
  total_outstanding: number;
  aging: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
  invoices: OutstandingInvoice[];
}

// ─── Helpers ───────────────────────────────────────────────────

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

function formatAddress(addr: Address | undefined | null): string {
  if (!addr) return "";
  return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ");
}

const typeBadgeMap: Record<
  string,
  { variant: "info" | "warning" | "default"; label: string }
> = {
  customer: { variant: "info", label: "Customer" },
  vendor: { variant: "warning", label: "Vendor" },
  both: { variant: "default", label: "Customer & Vendor" },
};

const statusBadgeMap: Record<
  string,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  overdue: { variant: "danger", label: "Overdue" },
  partially_paid: { variant: "warning", label: "Partially Paid" },
  paid: { variant: "success", label: "Paid" },
  cancelled: { variant: "default", label: "Cancelled" },
};

// ─── Transaction Columns ───────────────────────────────────────

const txnColumnHelper = createColumnHelper<Transaction>();

const txnColumns = [
  txnColumnHelper.accessor("date", {
    header: "Date",
    cell: (info) => (
      <span className="text-gray-600">{formatDate(info.getValue())}</span>
    ),
  }),
  txnColumnHelper.accessor("transaction_type", {
    header: "Type",
    cell: (info) => {
      const isInvoice = info.getValue() === "invoice";
      return (
        <Badge variant={isInvoice ? "info" : "success"}>
          {isInvoice ? "Invoice" : "Payment"}
        </Badge>
      );
    },
  }),
  txnColumnHelper.accessor("number", {
    header: "Number / Ref",
    cell: (info) => {
      const row = info.row.original;
      if (row.transaction_type === "invoice") {
        return (
          <Link
            href={`/invoices/${row.id}`}
            className="font-medium text-primary-800 hover:underline"
          >
            {row.number}
          </Link>
        );
      }
      return (
        <span className="text-gray-700">
          {row.reference || row.method?.replace(/_/g, " ") || "-"}
        </span>
      );
    },
  }),
  txnColumnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const row = info.row.original;
      if (row.transaction_type === "payment") {
        return <Badge variant="success">Received</Badge>;
      }
      const s = statusBadgeMap[info.getValue() || "draft"];
      return (
        <Badge variant={s.variant} dot>
          {s.label}
        </Badge>
      );
    },
  }),
  txnColumnHelper.accessor("amount", {
    header: "Amount",
    cell: (info) => (
      <span className="font-semibold text-gray-900">
        {formatCurrency(toNum(info.getValue()))}
      </span>
    ),
  }),
  txnColumnHelper.accessor("balance_due", {
    header: "Balance",
    cell: (info) => {
      const row = info.row.original;
      if (row.transaction_type === "payment") return <span>-</span>;
      const bal = toNum(info.getValue());
      return (
        <span className={bal > 0 ? "text-danger-600 font-medium" : "text-gray-500"}>
          {bal > 0 ? formatCurrency(bal) : "Paid"}
        </span>
      );
    },
  }),
];

// ─── Component ─────────────────────────────────────────────────

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params.id as string;
  const [activeTab, setActiveTab] = useState("transactions");
  const [txnSorting, setTxnSorting] = useState<SortingState>([]);
  const [txnFilter, setTxnFilter] = useState<string>("");

  // ─── Queries ──────────────────────────────────────────────────

  const { data: contact, isLoading: contactLoading } = useQuery<Contact>({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Contact>>(`/bill/contacts/${contactId}`);
      return res.data;
    },
  });

  const { data: summary } = useQuery<ContactSummary>({
    queryKey: ["contact-summary", contactId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ContactSummary>>(`/bill/contacts/${contactId}/summary`);
      return res.data;
    },
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["contact-transactions", contactId, txnFilter],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "100" };
      if (txnFilter) params.type = txnFilter;
      const res = await api.get<ApiResponse<Transaction[]>>(`/bill/contacts/${contactId}/transactions`, params);
      return res.data;
    },
  });

  const { data: outstandingData } = useQuery<OutstandingData>({
    queryKey: ["contact-outstanding", contactId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<OutstandingData>>(`/bill/contacts/${contactId}/outstanding`);
      return res.data;
    },
  });

  // ─── Table ────────────────────────────────────────────────────

  const txnTable = useReactTable({
    data: transactions,
    columns: txnColumns,
    state: { sorting: txnSorting },
    onSortingChange: setTxnSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ─── Tabs ─────────────────────────────────────────────────────

  const tabs = [
    { value: "transactions", label: "Transactions" },
    { value: "outstanding", label: "Outstanding" },
    { value: "details", label: "Details" },
  ];

  // ─── Loading ──────────────────────────────────────────────────

  if (contactLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div className="h-16 bg-gray-100 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Contact not found</h1>
        </div>
      </div>
    );
  }

  const typeInfo = typeBadgeMap[contact.type] || typeBadgeMap.customer;
  const initials = contact.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <span className="text-base font-semibold text-primary-800">
            {initials}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {contact.name}
            </h1>
            <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
            {!contact.is_active && (
              <Badge variant="danger">Inactive</Badge>
            )}
          </div>
          {contact.gstin && (
            <p className="text-sm text-gray-500 mt-0.5">
              GSTIN: {contact.gstin}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit3 className="h-4 w-4" />}
          >
            Edit
          </Button>
          <Link href="/invoices/new">
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
            >
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<IndianRupee className="h-5 w-5 text-success-700" />}
          label="Total Revenue"
          value={formatCurrency(summary?.total_revenue ?? 0)}
          iconBg="bg-success-50"
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5 text-warning-700" />}
          label="Outstanding"
          value={formatCurrency(summary?.total_outstanding ?? 0)}
          iconBg="bg-warning-50"
          highlight={toNum(summary?.total_outstanding) > 0}
        />
        <SummaryCard
          icon={<FileText className="h-5 w-5 text-primary-800" />}
          label="Total Invoices"
          value={String(summary?.total_invoices ?? 0)}
          iconBg="bg-primary-50"
        />
        <SummaryCard
          icon={<Calendar className="h-5 w-5 text-gray-600" />}
          label="Last Transaction"
          value={
            summary?.last_transaction_date
              ? formatDate(summary.last_transaction_date)
              : "N/A"
          }
          iconBg="bg-gray-100"
        />
      </div>

      {/* ─── Tabs Content ────────────────────────────────────── */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
            {activeTab === "transactions" && (
              <div className="flex items-center gap-2">
                <Button
                  variant={txnFilter === "" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTxnFilter("")}
                >
                  All
                </Button>
                <Button
                  variant={txnFilter === "invoice" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTxnFilter("invoice")}
                >
                  Invoices
                </Button>
                <Button
                  variant={txnFilter === "payment" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTxnFilter("payment")}
                >
                  Payments
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <DataTable
            table={txnTable}
            onRowClick={(row) => {
              if (row.transaction_type === "invoice") {
                window.location.href = `/invoices/${row.id}`;
              }
            }}
          />
        )}

        {/* Outstanding Tab */}
        {activeTab === "outstanding" && (
          <div>
            {/* Aging Summary */}
            {outstandingData && (
              <div className="p-4 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <AgingBadge
                    label="Total"
                    value={outstandingData.total_outstanding}
                    color="primary"
                  />
                  <AgingBadge
                    label="Current"
                    value={outstandingData.aging.current}
                    color="success"
                  />
                  <AgingBadge
                    label="1-30 days"
                    value={outstandingData.aging.days_1_30}
                    color="info"
                  />
                  <AgingBadge
                    label="31-60 days"
                    value={outstandingData.aging.days_31_60}
                    color="warning"
                  />
                  <AgingBadge
                    label="61-90 days"
                    value={outstandingData.aging.days_61_90}
                    color="danger"
                  />
                  <AgingBadge
                    label="90+ days"
                    value={outstandingData.aging.days_90_plus}
                    color="danger"
                  />
                </div>
              </div>
            )}

            {/* Outstanding Invoices */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Invoice
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Due Date
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Paid
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Balance
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      Aging
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase w-24">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(!outstandingData?.invoices ||
                    outstandingData.invoices.length === 0) && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-gray-500"
                      >
                        No outstanding invoices
                      </td>
                    </tr>
                  )}
                  {outstandingData?.invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-primary-800 hover:underline"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(inv.date)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {inv.due_date ? formatDate(inv.due_date) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {formatCurrency(toNum(inv.total))}
                      </td>
                      <td className="py-3 px-4 text-right text-success-700">
                        {toNum(inv.amount_paid) > 0
                          ? formatCurrency(toNum(inv.amount_paid))
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-danger-600">
                        {formatCurrency(toNum(inv.balance_due))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <AgingPill
                          days={inv.days_past_due}
                          bucket={inv.aging_bucket}
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link href={`/invoices/${inv.id}/record-payment`}>
                          <Button variant="ghost" size="sm">
                            <CreditCard className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact Info */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-gray-900">
                  Contact Information
                </h3>
                <DetailRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="Company Name"
                  value={contact.company_name || "-"}
                />
                <DetailRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={contact.email || "-"}
                />
                <DetailRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={contact.phone || "-"}
                />
                {contact.whatsapp && (
                  <DetailRow
                    icon={<Phone className="h-4 w-4" />}
                    label="WhatsApp"
                    value={contact.whatsapp}
                  />
                )}
                <DetailRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="GSTIN"
                  value={contact.gstin || "-"}
                />
                <DetailRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="PAN"
                  value={contact.pan || "-"}
                />
                <DetailRow
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Payment Terms"
                  value={`${contact.payment_terms} days`}
                />
                {contact.credit_limit && (
                  <DetailRow
                    icon={<IndianRupee className="h-4 w-4" />}
                    label="Credit Limit"
                    value={formatCurrency(toNum(contact.credit_limit))}
                  />
                )}
                {toNum(contact.opening_balance) !== 0 && (
                  <DetailRow
                    icon={<IndianRupee className="h-4 w-4" />}
                    label="Opening Balance"
                    value={formatCurrency(toNum(contact.opening_balance))}
                  />
                )}
              </div>

              {/* Addresses */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Billing Address
                  </h3>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <span>
                      {formatAddress(contact.billing_address) || "Not provided"}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Shipping Address
                  </h3>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <span>
                      {formatAddress(contact.shipping_address) || "Same as billing"}
                    </span>
                  </div>
                </div>

                {contact.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Notes
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {contact.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  iconBg,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <Card hover>
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p
            className={`text-lg font-bold ${
              highlight ? "text-warning-700" : "text-gray-900"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

function AgingBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "primary" | "success" | "info" | "warning" | "danger";
}) {
  const colorMap = {
    primary: "bg-primary-50 text-primary-800",
    success: "bg-success-50 text-success-700",
    info: "bg-primary-50 text-primary-700",
    warning: "bg-warning-50 text-warning-700",
    danger: "bg-danger-50 text-danger-700",
  };

  return (
    <div className={`rounded-lg p-3 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-sm font-bold">{formatCurrency(value)}</p>
    </div>
  );
}

function AgingPill({
  days,
  bucket,
}: {
  days: number;
  bucket: string;
}) {
  const colorMap: Record<string, string> = {
    current: "bg-success-50 text-success-700",
    "1-30": "bg-primary-50 text-primary-700",
    "31-60": "bg-warning-50 text-warning-700",
    "61-90": "bg-danger-50 text-danger-600",
    "90+": "bg-danger-100 text-danger-700",
  };

  const color = colorMap[bucket] || colorMap.current;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {days === 0 ? "Current" : `${days}d`}
    </span>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}
