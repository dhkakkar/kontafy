"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Zap, ListChecks } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Bill-wise settlement table for the Record Payment / Record Receipt
 * pages. Fetches a contact's outstanding invoices/bills (oldest first)
 * and lets the user split the payment across them line by line.
 *
 * Two modes via the `direction` prop:
 *   - 'receive' (customer paying us)  → fetches sales invoices
 *   - 'pay'     (we paying a vendor)  → fetches purchase bills
 *
 * The parent owns the allocations array — this component reports
 * changes via `onChange`. Keeping state lifted means the parent can
 * combine allocations with form fields (bank account, date, etc.) in
 * one POST body without prop drilling.
 *
 * Allocation policy:
 *   - Σ allocations may be LESS than payment amount → the gap is an
 *     "advance" and the parent surfaces a confirmation banner before
 *     submit (we do not enforce a max here, only ≤ payment).
 *   - Per-row alloc.amount must be ≤ that invoice's balance_due —
 *     enforced on blur with a clamp.
 *   - Sorted FIFO so "Apply to Oldest" fills from index 0 down.
 */

export interface OutstandingInvoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
}

export interface PaymentAllocation {
  invoice_id: string;
  amount: number;
}

interface Props {
  contactId: string | null | undefined;
  paymentAmount: number;
  direction: "receive" | "pay";
  // When the parent opened this from an invoice/bill detail page,
  // we pre-select that one with the full payment amount as a smart
  // default ("user clicked Record Payment from the invoice, they
  // almost certainly want to allocate it there").
  defaultInvoiceId?: string | null;
  // Reported every time the user edits an allocation cell. Parent
  // re-renders the totals / advance preview from this.
  onChange: (allocations: PaymentAllocation[]) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function PaymentAllocationTable({
  contactId,
  paymentAmount,
  direction,
  defaultInvoiceId,
  onChange,
}: Props) {
  // invoice_id → string-as-typed-by-user. Stored as string so an
  // empty cell stays empty (not "0") and so leading typing like
  // "1." or "41300." renders without snapping to a number.
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-outstanding", contactId, direction],
    enabled: !!contactId,
    queryFn: async () => {
      const raw = (await api.get(
        `/bill/payments/outstanding/contact/${contactId}`,
        { direction },
      )) as any;
      // The endpoint returns { data: OutstandingInvoice[], meta }.
      // Through the ResponseInterceptor the paginated shape is
      // surfaced as { success, data: [...], meta: {...} }, so we
      // pull `.data` whichever variant we end up with.
      const list: OutstandingInvoice[] =
        raw?.data && Array.isArray(raw.data) ? raw.data : raw?.data?.data || [];
      return list;
    },
  });

  const invoices = useMemo(() => data ?? [], [data]);

  // First-load smart defaults: if `defaultInvoiceId` is present in
  // the fetched list, seed it with min(paymentAmount, balance_due).
  // Done in an effect (rather than during render) so re-typing the
  // payment amount doesn't keep snapping the cell back.
  useEffect(() => {
    if (!invoices.length) return;
    if (Object.keys(draft).length > 0) return; // user already edited

    if (defaultInvoiceId) {
      const target = invoices.find((i) => i.id === defaultInvoiceId);
      if (target) {
        // When invoices arrive before the parent's amount pre-fill
        // effect has run, paymentAmount is still 0 — fall back to
        // the invoice's full balance_due so the row seeds anyway.
        // Otherwise the user lands on an empty table even though
        // the obvious default (full settlement of this bill) was
        // available.
        const seed =
          paymentAmount > 0
            ? Math.min(paymentAmount, target.balance_due)
            : target.balance_due;
        if (seed > 0) {
          setDraft({ [target.id]: seed.toString() });
        }
      }
    }
    // We intentionally only run when invoices first arrive or
    // defaultInvoiceId changes — paymentAmount changes shouldn't
    // wipe the user's manual edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, defaultInvoiceId]);

  // Push the parsed-and-rounded allocations to the parent every
  // time the draft changes. Rows with 0 / empty / unparseable get
  // dropped so they don't bloat the POST body.
  useEffect(() => {
    const allocations: PaymentAllocation[] = [];
    for (const [invoiceId, raw] of Object.entries(draft)) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        allocations.push({ invoice_id: invoiceId, amount: round2(n) });
      }
    }
    onChange(allocations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const totalAllocated = useMemo(() => {
    return Object.values(draft).reduce((s, v) => {
      const n = Number(v);
      return s + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
  }, [draft]);

  const advance = Math.max(0, round2(paymentAmount - totalAllocated));
  const overAllocated = round2(totalAllocated) > round2(paymentAmount);

  // ── Quick-action helpers ────────────────────────────────────────

  // FIFO fill: walk invoices oldest-first, hand out the remaining
  // payment amount to each until the wallet runs dry. Each row caps
  // at the invoice's balance_due so we never overpay any one bill.
  const applyToOldest = () => {
    let remaining = round2(paymentAmount);
    const next: Record<string, string> = {};
    for (const inv of invoices) {
      if (remaining <= 0) break;
      const give = Math.min(remaining, inv.balance_due);
      if (give > 0) {
        next[inv.id] = round2(give).toString();
        remaining = round2(remaining - give);
      }
    }
    setDraft(next);
  };

  // Single-shot apply: put the whole payment on the first invoice
  // that can absorb it. Useful when the customer paid a single bill
  // outright and the page already shows the right amount.
  const applyFull = () => {
    if (invoices.length === 0) return;
    const target = invoices[0];
    const give = Math.min(paymentAmount, target.balance_due);
    if (give > 0) {
      setDraft({ [target.id]: round2(give).toString() });
    }
  };

  const clearAll = () => setDraft({});

  // ── Per-cell handlers ───────────────────────────────────────────

  const onCellChange = (invoiceId: string, value: string) => {
    setDraft((d) => ({ ...d, [invoiceId]: value }));
  };

  // On blur: clamp to [0, balance_due]. Clamping on blur (rather than
  // on keystroke) keeps the cell editable while the user is typing —
  // "4130" en route to "41300" briefly exceeds nothing, but on blur
  // a paste of "999999" snaps down to the bill's balance.
  const onCellBlur = (invoiceId: string, balanceDue: number) => {
    setDraft((d) => {
      const raw = d[invoiceId];
      if (raw == null || raw === "") return d;
      let n = Number(raw);
      if (!Number.isFinite(n) || n < 0) n = 0;
      if (n > balanceDue) n = balanceDue;
      const rounded = round2(n);
      return { ...d, [invoiceId]: rounded > 0 ? rounded.toString() : "" };
    });
  };

  // ── Render ──────────────────────────────────────────────────────

  if (!contactId) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
        Select a {direction === "receive" ? "customer" : "vendor"} to see outstanding{" "}
        {direction === "receive" ? "invoices" : "bills"}.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg py-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-danger-200 bg-danger-50 rounded-lg p-4 text-sm text-danger-700">
        Failed to load outstanding {direction === "receive" ? "invoices" : "bills"}.
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
        No outstanding {direction === "receive" ? "invoices" : "bills"} for this{" "}
        {direction === "receive" ? "customer" : "vendor"}.
        {paymentAmount > 0 && (
          <>
            {" "}
            The full {formatCurrency(paymentAmount)} will be recorded as an{" "}
            {direction === "receive" ? "advance from customer" : "advance to vendor"}.
          </>
        )}
      </div>
    );
  }

  const totalOutstanding = invoices.reduce((s, i) => s + i.balance_due, 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header strip */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">{invoices.length}</span> outstanding{" "}
          {direction === "receive" ? "invoice" : "bill"}
          {invoices.length === 1 ? "" : "s"} · Total due:{" "}
          <span className="font-medium text-gray-700">{formatCurrency(totalOutstanding)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyFull}
            icon={<Zap className="h-3.5 w-3.5" />}
            disabled={!paymentAmount}
          >
            Apply Full
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyToOldest}
            icon={<ListChecks className="h-3.5 w-3.5" />}
            disabled={!paymentAmount}
          >
            Apply to Oldest (FIFO)
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            Clear
          </Button>
        </div>
      </div>

      {/* Allocation table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {direction === "receive" ? "Invoice" : "Bill"}
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                Allocate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => {
              const raw = draft[inv.id] ?? "";
              const num = Number(raw);
              const allocated = Number.isFinite(num) && num > 0 ? num : 0;
              const wouldFullyPay = allocated >= inv.balance_due - 0.005;
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-primary-800">{inv.invoice_number}</div>
                    {inv.status === "partially_paid" && (
                      <Badge variant="warning" className="mt-0.5">
                        Partial
                      </Badge>
                    )}
                    {inv.status === "overdue" && (
                      <Badge variant="danger" className="mt-0.5">
                        Overdue
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {formatDate(inv.date)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    {formatCurrency(inv.balance_due)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={inv.balance_due}
                      step="0.01"
                      value={raw}
                      onChange={(e) => onCellChange(inv.id, e.target.value)}
                      onBlur={() => onCellBlur(inv.id, inv.balance_due)}
                      placeholder="0.00"
                      className="w-32 h-8 px-2 text-right rounded-md border border-gray-300 bg-white text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    {wouldFullyPay && allocated > 0 && (
                      <div className="text-[10px] text-success-600 mt-0.5">→ Paid</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Total Allocated</div>
            <div className="font-semibold text-gray-900 tabular-nums">
              {formatCurrency(round2(totalAllocated))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Payment Amount</div>
            <div className="font-semibold text-gray-900 tabular-nums">
              {formatCurrency(round2(paymentAmount))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">
              {advance > 0
                ? direction === "receive"
                  ? "Unallocated → Advance from customer"
                  : "Unallocated → Advance to vendor"
                : "Unallocated"}
            </div>
            <div
              className={`font-semibold tabular-nums ${
                advance > 0 ? "text-amber-700" : "text-gray-400"
              }`}
            >
              {formatCurrency(advance)}
            </div>
          </div>
        </div>

        {overAllocated && (
          <div className="mt-3 flex items-start gap-2 text-xs text-danger-700 bg-danger-50 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Allocated amount ({formatCurrency(round2(totalAllocated))}) exceeds the
              payment amount ({formatCurrency(round2(paymentAmount))}). Adjust the
              cells before submitting.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
