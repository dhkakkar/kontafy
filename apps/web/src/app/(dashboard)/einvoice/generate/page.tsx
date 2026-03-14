"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, FileCheck, ArrowLeft, Loader2 } from "lucide-react";
import {
  useEInvoiceList,
  useGenerateEInvoice,
  useBulkGenerateEInvoice,
  type EInvoiceListItem,
} from "@/hooks/use-einvoice";

const columnHelper = createColumnHelper<EInvoiceListItem>();

export default function GenerateEInvoicePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data: listData, isLoading } = useEInvoiceList({
    page: 1,
    limit: 100,
    status: "pending",
    search: searchQuery || undefined,
  });

  const generateOne = useGenerateEInvoice();
  const bulkGenerate = useBulkGenerateEInvoice();

  const invoices = listData?.data ?? [];

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((idx) => invoices[Number(idx)]?.id)
      .filter(Boolean);
  }, [rowSelection, invoices]);

  const handleGenerateSelected = async () => {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      try {
        await generateOne.mutateAsync(selectedIds[0]);
        router.push(`/einvoice/${selectedIds[0]}`);
      } catch {
        // Error handled by mutation
      }
    } else {
      try {
        const result = await bulkGenerate.mutateAsync(selectedIds);
        alert(result.message);
        router.push("/einvoice");
      } catch {
        // Error handled by mutation
      }
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="rounded border-gray-300"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-gray-300"
          />
        ),
      }),
      columnHelper.accessor("invoice_number", {
        header: "Invoice #",
        cell: (info) => (
          <span className="font-medium text-primary-800">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("contact_name", {
        header: "Customer",
        cell: (info) => (
          <span className="text-gray-900">{info.getValue() || "N/A"}</span>
        ),
      }),
      columnHelper.accessor("contact_gstin", {
        header: "GSTIN",
        cell: (info) => (
          <span className="text-xs font-mono text-gray-500">
            {info.getValue() || "N/A"}
          </span>
        ),
      }),
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("total", {
        header: "Amount",
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => {
          const typeMap: Record<string, string> = {
            sale: "Invoice",
            credit_note: "Credit Note",
            debit_note: "Debit Note",
          };
          return (
            <Badge variant="default">
              {typeMap[info.getValue()] || info.getValue()}
            </Badge>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: invoices,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  const isSubmitting = generateOne.isPending || bulkGenerate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/einvoice")}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Generate E-Invoices
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Select invoices to generate e-invoices via NIC portal
            </p>
          </div>
        </div>
        <Button
          icon={
            isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCheck className="h-4 w-4" />
            )
          }
          disabled={selectedIds.length === 0 || isSubmitting}
          onClick={handleGenerateSelected}
        >
          {isSubmitting
            ? "Generating..."
            : `Generate ${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
        </Button>
      </div>

      {(generateOne.isError || bulkGenerate.isError) && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            {generateOne.error?.message || bulkGenerate.error?.message}
          </p>
        </Card>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <Input
            placeholder="Search pending invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
          <span className="text-sm text-gray-500">
            {selectedIds.length} of {invoices.length} selected
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900">
              No pending invoices
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              All eligible invoices already have e-invoices generated.
            </p>
          </div>
        ) : (
          <DataTable table={table} />
        )}
      </Card>
    </div>
  );
}
