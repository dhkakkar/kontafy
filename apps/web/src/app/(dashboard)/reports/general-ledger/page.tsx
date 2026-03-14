"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useGeneralLedger, useExportReport } from "@/hooks/use-reports";

export default function GeneralLedgerPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [accountId, setAccountId] = useState("");

  const { data, isLoading } = useGeneralLedger({
    fromDate,
    toDate,
    accountId: accountId || undefined,
  });

  const exportMutation = useExportReport();

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportMutation.mutateAsync({
      reportType: "general-ledger",
      format,
      filters: { fromDate, toDate, ...(accountId && { accountId }) },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `general-ledger-${today}.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/reports")}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              General Ledger
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Account-wise transaction details with running balance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={() => handleExport("excel")}
            disabled={exportMutation.isPending}
          >
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={exportMutation.isPending}
          >
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={exportMutation.isPending}
          >
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account ID (optional)
            </label>
            <Input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Filter by account ID"
            />
          </div>
        </div>
      </Card>

      {/* Data */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <div className="space-y-3">
                <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-8 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : data?.accounts && data.accounts.length > 0 ? (
        <div className="space-y-6">
          {data.accounts.map((account) => (
            <Card key={account.account.id} padding="none">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {account.account.code && `${account.account.code} - `}
                      {account.account.name}
                    </h3>
                    <span className="text-xs text-gray-500 capitalize">
                      {account.account.type}
                      {account.account.sub_type && ` / ${account.account.sub_type}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Closing: </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(account.closing_balance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">
                        Date
                      </th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">
                        Entry #
                      </th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">
                        Narration
                      </th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">
                        Debit
                      </th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">
                        Credit
                      </th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      <td colSpan={3} className="px-4 py-2 text-gray-500 italic">
                        Opening Balance
                      </td>
                      <td className="text-right px-4 py-2" />
                      <td className="text-right px-4 py-2" />
                      <td className="text-right px-4 py-2 font-medium text-gray-900">
                        {formatCurrency(account.opening_balance)}
                      </td>
                    </tr>
                    {account.transactions.map((txn, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">
                          {formatDate(txn.date)}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {txn.entry_number}
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {txn.narration || txn.description || "--"}
                        </td>
                        <td className="text-right px-4 py-2 text-gray-900">
                          {txn.debit > 0 ? formatCurrency(txn.debit) : ""}
                        </td>
                        <td className="text-right px-4 py-2 text-gray-900">
                          {txn.credit > 0 ? formatCurrency(txn.credit) : ""}
                        </td>
                        <td className="text-right px-4 py-2 font-medium text-gray-900">
                          {formatCurrency(txn.balance)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={3} className="px-4 py-2 text-gray-900">
                        Closing Balance
                      </td>
                      <td className="text-right px-4 py-2 text-gray-900">
                        {formatCurrency(account.total_debit)}
                      </td>
                      <td className="text-right px-4 py-2 text-gray-900">
                        {formatCurrency(account.total_credit)}
                      </td>
                      <td className="text-right px-4 py-2 text-gray-900">
                        {formatCurrency(account.closing_balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">
              No ledger entries found for the selected period.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
