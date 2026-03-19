"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";

interface JournalLine {
  id: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

function generateLineId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { id: generateLineId(), accountId: "", description: "", debit: 0, credit: 0 },
    { id: generateLineId(), accountId: "", description: "", debit: 0, credit: 0 },
  ]);

  // Fetch accounts from API
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get<{ data: Account[] }>("/books/accounts");
      return res.data;
    },
  });

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.code} - ${a.name}`,
  }));

  // Create journal entry mutation
  const createEntry = useMutation({
    mutationFn: async (isPosted: boolean) => {
      return api.post("/books/journal-entries", {
        date,
        narration: narration || undefined,
        is_posted: isPosted,
        lines: lines
          .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0))
          .map((l) => ({
            account_id: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description || undefined,
          })),
      });
    },
    onSuccess: () => {
      router.push("/books/journal");
    },
  });

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const difference = Math.abs(totalDebit - totalCredit);

  const addLine = () => {
    setLines([
      ...lines,
      { id: generateLineId(), accountId: "", description: "", debit: 0, credit: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (
    id: string,
    field: keyof JournalLine,
    value: string | number
  ) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "debit" && Number(value) > 0) {
          updated.credit = 0;
        } else if (field === "credit" && Number(value) > 0) {
          updated.debit = 0;
        }
        return updated;
      })
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              New Journal Entry
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create a manual journal entry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4" />}
            onClick={() => createEntry.mutate(false)}
            loading={createEntry.isPending}
          >
            Save as Draft
          </Button>
          <Button
            icon={<Send className="h-4 w-4" />}
            disabled={!isBalanced || !narration}
            onClick={() => createEntry.mutate(true)}
            loading={createEntry.isPending}
          >
            Post Entry
          </Button>
        </div>
      </div>

      {createEntry.isError && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
          {createEntry.error?.message || "Failed to create journal entry"}
        </div>
      )}

      {/* Entry Details */}
      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Reference Number"
            placeholder="Auto-generated"
            disabled
          />
        </div>
        <div className="mt-4">
          <Input
            label="Narration / Description"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Enter the purpose of this journal entry"
          />
        </div>
      </Card>

      {/* Journal Lines */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <CardHeader className="!mb-0">
            <CardTitle>Entry Lines</CardTitle>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={addLine}
            >
              Add Line
            </Button>
          </CardHeader>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[280px]">
                  Account
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[160px]">
                  Debit
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[160px]">
                  Credit
                </th>
                <th className="w-[50px]" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-gray-100"
                >
                  <td className="py-2 px-4">
                    <Select
                      options={accountOptions}
                      value={line.accountId}
                      onChange={(val) => updateLine(line.id, "accountId", val)}
                      searchable
                      placeholder="Select account"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) =>
                        updateLine(line.id, "description", e.target.value)
                      }
                      placeholder="Line description"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={line.debit || ""}
                      onChange={(e) =>
                        updateLine(
                          line.id,
                          "debit",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={line.credit || ""}
                      onChange={(e) =>
                        updateLine(
                          line.id,
                          "credit",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 2}
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={2} className="py-3 px-4 text-right">
                  <span className="text-sm font-semibold text-gray-700">
                    Totals
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(totalDebit)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(totalCredit)}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Balance Status */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isBalanced ? (
              <Badge variant="success" dot>
                Entry is balanced
              </Badge>
            ) : totalDebit === 0 && totalCredit === 0 ? (
              <Badge variant="default">Enter amounts to begin</Badge>
            ) : (
              <Badge variant="danger" dot>
                Out of balance by {formatCurrency(difference)}
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {lines.length} line{lines.length > 1 ? "s" : ""}
          </div>
        </div>
      </Card>
    </div>
  );
}
