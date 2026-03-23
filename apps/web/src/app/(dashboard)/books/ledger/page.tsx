"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Search, Download, Loader2 } from "lucide-react";

interface LedgerEntry {
  date: string;
  entry_number?: number;
  narration: string | null;
  reference: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface LedgerResponse {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  opening_balance: number;
  closing_balance: number;
  entries: LedgerEntry[];
}

interface ApiResponse<T> {
  data: T;
}

export default function LedgerPage() {
  const [accountId, setAccountId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts-flat"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Account[]>>("/books/accounts");
      return res.data;
    },
  });

  const { data: ledgerData, isLoading } = useQuery<LedgerResponse | null>({
    queryKey: ["ledger", accountId, startDate, endDate],
    queryFn: async () => {
      if (!accountId) return null;
      const params: Record<string, string> = {};
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;
      const res = await api.get<ApiResponse<LedgerResponse>>(`/books/ledger/${accountId}`, params);
      return res.data;
    },
    enabled: !!accountId,
  });

  const entries = ledgerData?.entries || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">
            View detailed ledger for any account
          </p>
        </div>
        <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />}>
          Export
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Select
              label="Account"
              options={accounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
              value={accountId}
              onChange={setAccountId}
              searchable
              placeholder="Select an account"
            />
          </div>
          <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </Card>

      {accountId && (
        <Card padding="none">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Narration</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Credit</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-600">{formatDate(entry.date)}</td>
                      <td className="py-3 px-4 text-gray-900">{entry.narration || "-"}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {formatCurrency(entry.running_balance)}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500">
                        No ledger entries found for this account
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
