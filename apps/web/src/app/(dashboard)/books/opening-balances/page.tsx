"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { Loader2, Save, Search, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

interface OpeningRow {
  id: string;
  code: string;
  name: string;
  type: string;
  sub_type: string | null;
  parent_id: string | null;
  is_system: boolean;
  is_active: boolean;
  is_suspense: boolean;
  current_debit: number;
  current_credit: number;
}

interface OpeningBalancesData {
  accounts: OpeningRow[];
  books_begin_from: string | null;
  suspense_account_id: string | null;
  totals: {
    debit: number;
    credit: number;
    difference: number;
    is_balanced: boolean;
  };
}

const TYPE_BADGES: Record<string, "info" | "warning" | "default" | "success" | "danger"> = {
  asset: "info",
  liability: "warning",
  equity: "default",
  income: "success",
  expense: "danger",
};

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "asset", label: "Assets" },
  { value: "liability", label: "Liabilities" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expenses" },
];

// Parent-group rows (the headings like 1000 Assets, 1100 Current Assets)
// shouldn't be editable — balances on those naturally roll up from their
// children. The simplest signal we have is "code ends in 00 and is_system",
// which is exactly the shape of the seeded group rows.
function isGroupHeading(row: OpeningRow): boolean {
  return row.is_system && /^[1-5]\d00$/.test(row.code);
}

export default function OpeningBalancesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  // Edited Dr/Cr values keyed by account id. Empty string vs "0" matters
  // (empty = untouched, "0" = explicitly cleared) but for our purposes
  // both behave the same — we send 0 to the backend either way.
  const [edits, setEdits] = useState<
    Record<string, { debit: string; credit: string }>
  >({});
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const { data, isLoading, error } = useQuery<OpeningBalancesData>({
    queryKey: ["opening-balances"],
    queryFn: async () => {
      const res = await api.get<{ data: OpeningBalancesData }>(
        "/books/accounts/opening-balances",
      );
      return (res as any)?.data || (res as any);
    },
  });

  // Seed the edits map from the server's current values once the data
  // arrives, so the inputs are pre-filled with whatever's already saved.
  useEffect(() => {
    if (!data?.accounts) return;
    setEdits((prev) => {
      // Don't overwrite anything the user has already typed in this
      // session — only fill rows we haven't seen yet.
      const next = { ...prev };
      for (const a of data.accounts) {
        if (next[a.id]) continue;
        next[a.id] = {
          debit: a.current_debit > 0 ? String(a.current_debit) : "",
          credit: a.current_credit > 0 ? String(a.current_credit) : "",
        };
      }
      return next;
    });
  }, [data]);

  const rows = data?.accounts ?? [];

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.is_suspense) return false; // suspense never editable
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (
        term &&
        !r.code.toLowerCase().includes(term) &&
        !r.name.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, search, typeFilter]);

  // Live running totals across the *editable, non-suspense* rows. Group
  // headings are visually rendered but don't contribute to the total —
  // their child balances are already in the editable rows.
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const r of rows) {
      if (r.is_suspense) continue;
      if (isGroupHeading(r)) continue;
      const e = edits[r.id];
      if (!e) continue;
      debit += Number(e.debit) || 0;
      credit += Number(e.credit) || 0;
    }
    const difference = +(debit - credit).toFixed(2);
    return { debit, credit, difference, balanced: Math.abs(difference) < 0.01 };
  }, [rows, edits]);

  const suspenseRow = rows.find((r) => r.is_suspense);

  const setSide = (id: string, side: "debit" | "credit", value: string) => {
    // Strip anything that isn't a digit or one decimal. Clear the
    // opposite side automatically — a journal line can only sit on one
    // side at a time.
    const clean = value.replace(/[^0-9.]/g, "");
    setEdits((prev) => ({
      ...prev,
      [id]: {
        debit: side === "debit" ? clean : "",
        credit: side === "credit" ? clean : "",
      },
    }));
    setSaveError("");
    setSaveSuccess("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = rows
        .filter((r) => !r.is_suspense && !isGroupHeading(r))
        .map((r) => {
          const e = edits[r.id] || { debit: "", credit: "" };
          return {
            account_id: r.id,
            debit: Number(e.debit) || 0,
            credit: Number(e.credit) || 0,
          };
        });
      return api.post("/books/accounts/opening-balances/bulk", {
        books_begin_from: data?.books_begin_from || undefined,
        entries,
      });
    },
    onSuccess: (res: any) => {
      const posted = res?.data?.posted ?? res?.posted ?? 0;
      setSaveSuccess(`Saved opening balances for ${posted} accounts.`);
      queryClient.invalidateQueries({ queryKey: ["opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-tree"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-flat"] });
    },
    onError: (err: any) => {
      setSaveError(err?.message || "Failed to save opening balances");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 text-center text-danger-600">
        Failed to load accounts. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opening Balances</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter opening balances for every ledger. Debit total must equal
          Credit total to save — the suspense account (3099) will net to zero
          when your trial is balanced.
          {data?.books_begin_from && (
            <>
              {" "}
              <span className="font-medium">
                As on {data.books_begin_from}.
              </span>
            </>
          )}
        </p>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative max-w-xs">
              <Input
                placeholder="Search code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {TYPE_FILTERS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTypeFilter(t.value)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    typeFilter === t.value
                      ? "bg-primary-800 text-white border-primary-800"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Code
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Type
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                  Debit (₹)
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                  Credit (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const isGroup = isGroupHeading(r);
                const e = edits[r.id] || { debit: "", credit: "" };
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-50 ${
                      isGroup ? "bg-gray-50/50" : "hover:bg-gray-50/30"
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono text-xs text-gray-500">
                      {r.code}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={
                            isGroup
                              ? "text-sm font-semibold text-gray-900"
                              : "text-sm text-gray-700"
                          }
                        >
                          {r.name}
                        </span>
                        {r.is_system && (
                          <Lock className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant={TYPE_BADGES[r.type] || "default"}>
                        {r.type}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right">
                      {isGroup ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={e.debit}
                          onChange={(ev) =>
                            setSide(r.id, "debit", ev.target.value)
                          }
                          placeholder="0.00"
                          className="w-36 h-9 rounded border border-gray-300 px-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      )}
                    </td>
                    <td className="py-2 px-2 text-right pr-4">
                      {isGroup ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={e.credit}
                          onChange={(ev) =>
                            setSide(r.id, "credit", ev.target.value)
                          }
                          placeholder="0.00"
                          className="w-36 h-9 rounded border border-gray-300 px-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                    No accounts match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50 sticky bottom-0">
              <tr className="border-t-2 border-gray-200">
                <td colSpan={3} className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                  TOTALS
                </td>
                <td className="py-3 px-2 text-right text-sm font-bold text-gray-900 font-mono">
                  {formatCurrency(totals.debit)}
                </td>
                <td className="py-3 px-2 text-right text-sm font-bold text-gray-900 font-mono pr-4">
                  {formatCurrency(totals.credit)}
                </td>
              </tr>
              <tr>
                <td colSpan={5} className="py-2 px-4">
                  {totals.balanced ? (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-success-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Balanced — Difference: ₹0.00
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-danger-600">
                      <AlertTriangle className="h-4 w-4" />
                      Unbalanced — Difference: {formatCurrency(Math.abs(totals.difference))}
                      <span className="text-xs text-gray-500 ml-1">
                        ({totals.difference > 0 ? "Dr exceeds Cr" : "Cr exceeds Dr"})
                      </span>
                    </div>
                  )}
                  {suspenseRow && (
                    <span className="ml-4 text-xs text-gray-500">
                      Suspense (3099): Dr {formatCurrency(suspenseRow.current_debit)}
                      {" / "}Cr {formatCurrency(suspenseRow.current_credit)}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {saveError && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">
          {saveSuccess}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setEdits({});
            queryClient.invalidateQueries({ queryKey: ["opening-balances"] });
          }}
          disabled={saveMutation.isPending}
        >
          Reset
        </Button>
        <Button
          icon={<Save className="h-4 w-4" />}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          disabled={!totals.balanced || saveMutation.isPending}
          title={
            totals.balanced
              ? "Save opening balances"
              : "Balance Dr and Cr totals before saving"
          }
        >
          Save All Balances
        </Button>
      </div>
    </div>
  );
}
