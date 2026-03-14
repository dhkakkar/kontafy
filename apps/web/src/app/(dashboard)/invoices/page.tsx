"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, Download, MoreHorizontal, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";

interface Invoice {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  status: "draft" | "sent" | "overdue" | "paid" | "cancelled";
}

const invoices: Invoice[] = [
  {
    id: "1",
    number: "INV-0047",
    customer: "TechStar Solutions",
    date: "2026-03-12",
    dueDate: "2026-04-12",
    amount: 125000,
    status: "sent",
  },
  {
    id: "2",
    number: "INV-0046",
    customer: "GreenLeaf Exports",
    date: "2026-03-09",
    dueDate: "2026-04-09",
    amount: 87500,
    status: "sent",
  },
  {
    id: "3",
    number: "INV-0045",
    customer: "Meridian Logistics",
    date: "2026-03-07",
    dueDate: "2026-04-07",
    amount: 210000,
    status: "paid",
  },
  {
    id: "4",
    number: "INV-0044",
    customer: "Prism Digital",
    date: "2026-03-05",
    dueDate: "2026-03-20",
    amount: 56000,
    status: "draft",
  },
  {
    id: "5",
    number: "INV-0043",
    customer: "Atlas Construction",
    date: "2026-03-01",
    dueDate: "2026-03-15",
    amount: 340000,
    status: "paid",
  },
  {
    id: "6",
    number: "INV-0038",
    customer: "Apex Manufacturing",
    date: "2026-02-15",
    dueDate: "2026-02-28",
    amount: 75000,
    status: "overdue",
  },
  {
    id: "7",
    number: "INV-0032",
    customer: "NovaTech Infra",
    date: "2026-02-01",
    dueDate: "2026-02-15",
    amount: 142000,
    status: "overdue",
  },
  {
    id: "8",
    number: "INV-0030",
    customer: "Summit Healthcare",
    date: "2026-01-20",
    dueDate: "2026-02-20",
    amount: 95000,
    status: "paid",
  },
];

const statusBadgeMap: Record<
  Invoice["status"],
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  overdue: { variant: "danger", label: "Overdue" },
  paid: { variant: "success", label: "Paid" },
  cancelled: { variant: "default", label: "Cancelled" },
};

const columnHelper = createColumnHelper<Invoice>();

export default function InvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const tabs = [
    { value: "all", label: "All", count: invoices.length },
    {
      value: "draft",
      label: "Draft",
      count: invoices.filter((i) => i.status === "draft").length,
    },
    {
      value: "sent",
      label: "Sent",
      count: invoices.filter((i) => i.status === "sent").length,
    },
    {
      value: "overdue",
      label: "Overdue",
      count: invoices.filter((i) => i.status === "overdue").length,
    },
    {
      value: "paid",
      label: "Paid",
      count: invoices.filter((i) => i.status === "paid").length,
    },
  ];

  const filteredData = useMemo(() => {
    return invoices.filter((inv) => {
      if (activeTab !== "all" && inv.status !== activeTab) return false;
      if (
        searchQuery &&
        !inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !inv.number.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeTab, searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("number", {
        header: "Invoice #",
        cell: (info) => (
          <span className="font-medium text-primary-800">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("customer", {
        header: "Customer",
        cell: (info) => (
          <span className="text-gray-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
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
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const s = statusBadgeMap[info.getValue()];
          return (
            <Badge variant={s.variant} dot>
              {s.label}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <div className="flex items-center gap-1">
            <button
              title="Send via WhatsApp"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const phone = prompt("Enter WhatsApp number (with country code, e.g. 919876543210):");
                if (phone) {
                  api
                    .post("/whatsapp/send-invoice", {
                      invoiceId: info.row.original.id,
                      phoneNumber: phone,
                    })
                    .then(() => alert("Invoice queued for WhatsApp delivery!"))
                    .catch((err: Error) => alert(err.message || "Failed to send"));
                }
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
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
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track your invoices
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
          <Link href="/invoices/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Invoice</Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by customer or invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        <DataTable
          table={table}
          onRowClick={(row) => router.push(`/invoices/${row.id}`)}
        />
      </Card>
    </div>
  );
}
