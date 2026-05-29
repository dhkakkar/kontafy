"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";

/**
 * Bank/Cash account picker for the Record Payment / Receipt pages.
 *
 * Backed by GET /bank/accounts, plus a synthetic "Cash in Hand" row
 * appended at the bottom. Selection model:
 *
 *   - When the user picks a real bank account, we hand back its
 *     `bank_account_id` (a uuid) — the backend will dereference it
 *     to the linked ledger code 1102.NNN at JE-posting time.
 *   - When the user picks "Cash in Hand", we hand back `null`. The
 *     backend then falls back to ledger 1101 (Cash in Hand) via
 *     the payment.method='cash' branch.
 *
 * `value` is the currently selected bank_account_id or the literal
 * "__cash__" sentinel for the cash row — kept distinct from null so
 * we can tell "user picked cash" apart from "nothing selected yet".
 */

interface BankAccount {
  id: string;
  account_name: string;
  bank_name?: string | null;
  account_number?: string | null;
  is_active: boolean;
}

interface Props {
  // "__cash__" → user explicitly picked Cash in Hand
  // uuid       → user picked a bank account
  // null/""    → unselected (initial state)
  value: string | null;
  onChange: (next: { bankAccountId: string | null; isCash: boolean }) => void;
  // When the parent form has a Payment Method (cash, upi, bank_transfer …)
  // we use it to auto-pick the cash row on first render if the method is
  // 'cash' and nothing's been selected yet. Without this hint the user
  // would always have to pick the cash row manually for cash receipts.
  paymentMethod?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

const CASH_SENTINEL = "__cash__";

export function BankCashAccountSelect({
  value,
  onChange,
  paymentMethod,
  label = "Bank / Cash Account",
  required = true,
  disabled = false,
}: Props) {
  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const raw = (await api.get("/bank/accounts")) as any;
      // Bank accounts endpoint returns a bare list (no { data, meta })
      // wrapped by ResponseInterceptor into { success, data: [...], meta }.
      return Array.isArray(raw) ? raw : raw?.data ?? [];
    },
  });

  const options = useMemo(() => {
    const banks = (accounts || [])
      .filter((a) => a.is_active !== false)
      .map((a) => ({
        value: a.id,
        label: a.bank_name
          ? `${a.bank_name} — ${a.account_name}`
          : a.account_name,
      }));
    // Cash row always last so it's a clearly-different choice from
    // the bank list. Without it, a user with no bank accounts seeded
    // would have no way to record a cash receipt.
    banks.push({ value: CASH_SENTINEL, label: "Cash in Hand" });
    return banks;
  }, [accounts]);

  // Auto-pick the cash row when the method is 'cash' and nothing's
  // selected yet — saves the user a click on the most common path.
  // Effect rather than render so we don't loop on parent re-renders.
  React.useEffect(() => {
    if (value) return;
    if (paymentMethod === "cash") {
      onChange({ bankAccountId: null, isCash: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, accounts.length]);

  const handleChange = (next: string) => {
    if (next === CASH_SENTINEL) {
      onChange({ bankAccountId: null, isCash: true });
    } else {
      onChange({ bankAccountId: next, isCash: false });
    }
  };

  return (
    <Select
      label={label + (required ? " *" : "")}
      options={options}
      value={value || ""}
      onChange={handleChange}
      placeholder={isLoading ? "Loading…" : "Select an account"}
      disabled={disabled || isLoading}
    />
  );
}

export const BANK_CASH_SENTINEL = CASH_SENTINEL;
