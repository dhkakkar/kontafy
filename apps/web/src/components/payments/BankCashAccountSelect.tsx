"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";

/**
 * Bank account picker for the Record Payment / Receipt flows.
 *
 * NOT shown for Payment Mode = Cash — cash is its own ledger
 * (1101 Cash in Hand), so the parent skips rendering this component
 * entirely when method='cash' and posts the payment with
 * bank_account_id=null. The backend's postPayment() handles the
 * fallback to 1101 when method=cash + bank_account_id=null.
 *
 * For every other mode (UPI / Bank Transfer / Cheque / Card) the
 * money lands in a specific bank account — debit needs to hit the
 * right 1102.NNN sub-ledger so bank reconciliation works. This
 * dropdown is the source of that selection and is mandatory in
 * non-cash modes.
 */

interface BankAccount {
  id: string;
  account_name: string;
  bank_name?: string | null;
  account_number?: string | null;
  is_active: boolean;
}

interface Props {
  value: string | null;
  onChange: (next: { bankAccountId: string | null }) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function BankCashAccountSelect({
  value,
  onChange,
  label = "Bank Account",
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
    return (accounts || [])
      .filter((a) => a.is_active !== false)
      .map((a) => ({
        value: a.id,
        label: a.bank_name
          ? `${a.bank_name} — ${a.account_name}`
          : a.account_name,
      }));
  }, [accounts]);

  const hasBanks = options.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label + (required ? " *" : "")}
        </label>
        {!isLoading && !hasBanks && (
          <Link
            href="/settings/invoices"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Add bank account
          </Link>
        )}
      </div>
      <Select
        options={options}
        value={value || ""}
        onChange={(v) => onChange({ bankAccountId: v || null })}
        placeholder={isLoading ? "Loading…" : "Select a bank"}
        disabled={disabled || isLoading || !hasBanks}
      />
      {!isLoading && !hasBanks && (
        <p className="text-xs text-amber-700 mt-1">
          No bank accounts yet. Add one in{" "}
          <Link
            href="/settings/invoices"
            target="_blank"
            className="font-medium text-primary-700 hover:underline"
          >
            Settings → Invoices → Bank Accounts
          </Link>{" "}
          to record this payment.
        </p>
      )}
    </div>
  );
}
