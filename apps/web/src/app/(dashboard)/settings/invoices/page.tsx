"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import {
  Save,
  FileText,
  Landmark,
  Loader2,
  Plus,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^[A-Za-z0-9]{9,18}$/;
// UPI VPAs are roughly "user@handle" — keep validation loose since handles
// vary widely (ybl, oksbi, paytm, axl, ibl, hdfcbank, etc.).
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9._-]*$/;
// SWIFT is 8 or 11 chars: 4 bank + 2 country + 2 location [+ 3 branch]
const SWIFT_REGEX = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

const ACCOUNT_TYPES = [
  { value: "current", label: "Current Account" },
  { value: "savings", label: "Savings Account" },
  { value: "od", label: "OD Account" },
  { value: "cc", label: "Cash Credit Account" },
  { value: "foreign", label: "Foreign Currency Account" },
  { value: "other", label: "Other" },
];

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  branch: string;
  account_type: string;
  upi_id: string;
  swift_code: string;
  is_primary: boolean;
  show_full_number: boolean;
}

function newBank(): BankAccount {
  return {
    id: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    bank_name: "",
    account_name: "",
    account_number: "",
    ifsc: "",
    branch: "",
    account_type: "current",
    upi_id: "",
    swift_code: "",
    is_primary: false,
    show_full_number: false,
  };
}

function maskAccount(acct: string): string {
  const digits = (acct || "").replace(/\s+/g, "");
  if (digits.length <= 4) return digits || "—";
  const last4 = digits.slice(-4);
  const masked = "X".repeat(Math.max(0, digits.length - 4));
  return (masked + last4).replace(/(.{4})/g, "$1 ").trim();
}

export default function InvoiceConfigPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    invoice_prefix: "INV-",
    next_invoice_number: "1",
    default_payment_terms: "30",
    default_terms_conditions:
      "Thank you for your business. Payment is due within the agreed terms.",
    default_notes: "",
  });

  const [banks, setBanks] = useState<BankAccount[]>([]);
  // expandedBankId tracks which bank's detail panel is open; only one is
  // expanded at a time so the list stays compact when there are many.
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: Record<string, any> }>("/settings/invoice-config")
      .then((res) => {
        const d = res.data;
        if (!d) return;
        setForm((prev) => ({
          ...prev,
          invoice_prefix: String(d.invoice_prefix || prev.invoice_prefix),
          next_invoice_number: String(
            d.next_invoice_number || prev.next_invoice_number,
          ),
          default_payment_terms: String(
            d.default_payment_terms || prev.default_payment_terms,
          ),
          default_terms_conditions: String(
            d.default_terms_conditions || prev.default_terms_conditions,
          ),
          default_notes: String(d.default_notes || ""),
        }));
        const loaded: BankAccount[] = Array.isArray(d.bank_accounts)
          ? d.bank_accounts.map((b: any) => ({
              id: b.id || `bank-${Math.random().toString(36).slice(2)}`,
              bank_name: b.bank_name || "",
              account_name: b.account_name || "",
              account_number: b.account_number || "",
              ifsc: (b.ifsc || "").toUpperCase(),
              branch: b.branch || "",
              account_type: b.account_type || "current",
              upi_id: b.upi_id || "",
              swift_code: (b.swift_code || "").toUpperCase(),
              is_primary: !!b.is_primary,
              show_full_number: !!b.show_full_number,
            }))
          : [];
        setBanks(loaded);
        if (loaded.length > 0) {
          // Open the primary by default so the user sees full details on load.
          const primary = loaded.find((b) => b.is_primary) || loaded[0];
          setExpandedBankId(primary.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setSaveError("");
  };

  const updateBank = (id: string, patch: Partial<BankAccount>) => {
    setBanks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setSuccess(false);
    setSaveError("");
  };

  const addBank = () => {
    const bank = newBank();
    // First bank added is automatically primary so the user can't end up
    // saving with zero primaries by accident.
    if (banks.length === 0) bank.is_primary = true;
    setBanks((prev) => [...prev, bank]);
    setExpandedBankId(bank.id);
  };

  const removeBank = (id: string) => {
    setBanks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      // If we just removed the primary, promote the first remaining bank
      // — invoices need a primary to render the bank block.
      if (next.length > 0 && !next.some((b) => b.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
    if (expandedBankId === id) setExpandedBankId(null);
  };

  const setPrimary = (id: string) => {
    setBanks((prev) =>
      prev.map((b) => ({ ...b, is_primary: b.id === id })),
    );
    setSuccess(false);
  };

  // Per-bank validation — keyed by bank.id so we can show inline errors
  // without forcing every error message into a single global object.
  const bankErrors = useMemo(() => {
    const errs: Record<string, Record<string, string>> = {};
    for (const b of banks) {
      const e: Record<string, string> = {};
      if (!b.bank_name.trim()) e.bank_name = "Bank name is required";
      if (!b.account_number.trim())
        e.account_number = "Account number is required";
      else if (!ACCOUNT_NUMBER_REGEX.test(b.account_number))
        e.account_number = "9-18 digits/letters only";
      if (!b.ifsc.trim()) e.ifsc = "IFSC is required";
      else if (!IFSC_REGEX.test(b.ifsc))
        e.ifsc = "Invalid IFSC (e.g. HDFC0001234)";
      if (b.upi_id && !UPI_REGEX.test(b.upi_id))
        e.upi_id = "Invalid UPI ID (e.g. business@icici)";
      if (b.swift_code && !SWIFT_REGEX.test(b.swift_code))
        e.swift_code = "SWIFT must be 8 or 11 characters";
      if (Object.keys(e).length > 0) errs[b.id] = e;
    }
    return errs;
  }, [banks]);

  const primaryCount = banks.filter((b) => b.is_primary).length;
  const hasBankRowErrors = Object.keys(bankErrors).length > 0;
  const banksValid =
    banks.length === 0 || (primaryCount === 1 && !hasBankRowErrors);

  const handleSave = async () => {
    if (!banksValid) {
      setSaveError(
        banks.length > 0 && primaryCount !== 1
          ? "Exactly one bank must be marked Primary."
          : "Please fix the highlighted bank fields before saving.",
      );
      // Expand the first errored bank so the user can see what's wrong.
      const firstErroredId = Object.keys(bankErrors)[0];
      if (firstErroredId) setExpandedBankId(firstErroredId);
      return;
    }
    setSaving(true);
    setSuccess(false);
    setSaveError("");
    try {
      await api.patch("/settings/invoice-config", {
        invoice_prefix: form.invoice_prefix,
        next_invoice_number: parseInt(form.next_invoice_number) || 1,
        default_payment_terms: parseInt(form.default_payment_terms) || 30,
        default_terms_conditions: form.default_terms_conditions,
        default_notes: form.default_notes,
        bank_accounts: banks.map((b) => ({
          id: b.id,
          bank_name: b.bank_name,
          account_name: b.account_name,
          account_number: b.account_number,
          ifsc: b.ifsc,
          branch: b.branch,
          account_type: b.account_type,
          upi_id: b.upi_id,
          swift_code: b.swift_code,
          is_primary: b.is_primary,
          show_full_number: b.show_full_number,
        })),
      });
      setSuccess(true);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Invoice Numbering */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Invoice Numbering
          </CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Invoice Prefix"
            value={form.invoice_prefix}
            onChange={(e) => updateField("invoice_prefix", e.target.value)}
            placeholder="e.g., INV-, KTF-"
            hint="This appears before the invoice number"
          />
          <Input
            label="Next Invoice Number"
            type="number"
            value={form.next_invoice_number}
            onChange={(e) => updateField("next_invoice_number", e.target.value)}
            placeholder="1"
            hint="The next invoice will use this number"
          />
          <Select
            label="Default Payment Terms"
            options={[
              { value: "0", label: "Due on Receipt" },
              { value: "7", label: "Net 7 (7 days)" },
              { value: "15", label: "Net 15 (15 days)" },
              { value: "30", label: "Net 30 (30 days)" },
              { value: "45", label: "Net 45 (45 days)" },
              { value: "60", label: "Net 60 (60 days)" },
              { value: "90", label: "Net 90 (90 days)" },
            ]}
            value={form.default_payment_terms}
            onChange={(v) => updateField("default_payment_terms", v)}
          />
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">
            Preview:{" "}
            <span className="font-mono font-medium text-gray-700">
              {(() => {
                const cleanPrefix = (form.invoice_prefix || "").replace(
                  /[-/_\s]+$/,
                  "",
                );
                const padded = String(form.next_invoice_number || "1").padStart(
                  2,
                  "0",
                );
                const now = new Date();
                const fyStartMonth = 4;
                const fyStart =
                  now.getMonth() + 1 >= fyStartMonth
                    ? now.getFullYear()
                    : now.getFullYear() - 1;
                const fyEnd = fyStart + 1;
                const fy = `${fyStart}-${String(fyEnd).slice(2)}`;
                return `${cleanPrefix}/${padded}/${fy}`;
              })()}
            </span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Format: <span className="font-mono">PREFIX/NN/YYYY-YY</span>. A
            trailing <code>-</code> or <code>/</code> on the prefix is stripped
            automatically.
          </p>
        </div>
      </Card>

      {/* Default Terms & Notes */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Default Terms & Notes</CardTitle>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={form.default_terms_conditions}
              onChange={(e) =>
                updateField("default_terms_conditions", e.target.value)
              }
              placeholder="Enter default terms & conditions for your invoices..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              This will appear at the bottom of every invoice by default
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Default Notes
            </label>
            <textarea
              rows={3}
              value={form.default_notes}
              onChange={(e) => updateField("default_notes", e.target.value)}
              placeholder="Any notes you want to include on invoices..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Bank Accounts */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-gray-400" />
            Bank Accounts
          </CardTitle>
        </CardHeader>

        <p className="text-sm text-gray-500 mb-4">
          Add one or more bank accounts. The account marked{" "}
          <Star className="inline h-3.5 w-3.5 text-amber-500" /> Primary appears
          by default on invoices and is used for the receivables ledger.
        </p>

        {banks.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Landmark className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No bank accounts added yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              icon={<Plus className="h-4 w-4" />}
              onClick={addBank}
            >
              Add Bank Account
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {banks.map((bank) => {
            const expanded = expandedBankId === bank.id;
            const errors = bankErrors[bank.id] || {};
            const hasErrors = Object.keys(errors).length > 0;
            return (
              <div
                key={bank.id}
                className={`rounded-lg border ${
                  hasErrors ? "border-danger-300" : "border-gray-200"
                } overflow-hidden`}
              >
                {/* Collapsed header row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setPrimary(bank.id)}
                    title={bank.is_primary ? "Primary bank" : "Mark as primary"}
                    className={`flex items-center justify-center h-6 w-6 rounded-full shrink-0 ${
                      bank.is_primary
                        ? "bg-amber-100 text-amber-600"
                        : "bg-gray-200 text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${bank.is_primary ? "fill-current" : ""}`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {bank.bank_name || "Untitled bank"}
                      </span>
                      {bank.is_primary && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                      {hasErrors && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-danger-700 bg-danger-100 px-2 py-0.5 rounded">
                          Incomplete
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      {bank.account_number
                        ? bank.show_full_number
                          ? bank.account_number
                          : maskAccount(bank.account_number)
                        : "No account number"}
                      {bank.ifsc && ` · ${bank.ifsc}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedBankId(expanded ? null : bank.id)}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label={expanded ? "Collapse" : "Expand"}
                  >
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(`Delete bank "${bank.bank_name || "Untitled"}"?`)
                      )
                        removeBank(bank.id);
                    }}
                    className="text-gray-400 hover:text-danger-600"
                    aria-label="Delete bank"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {expanded && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200">
                    <Input
                      label="Bank Name *"
                      value={bank.bank_name}
                      onChange={(e) =>
                        updateBank(bank.id, { bank_name: e.target.value })
                      }
                      placeholder="e.g., HDFC Bank"
                      error={errors.bank_name}
                    />
                    <Input
                      label="Account Holder Name"
                      value={bank.account_name}
                      onChange={(e) =>
                        updateBank(bank.id, { account_name: e.target.value })
                      }
                      placeholder="As per bank records"
                      hint="Defaults to your company legal name on invoices"
                    />
                    <Input
                      label="Account Number *"
                      value={bank.account_number}
                      onChange={(e) =>
                        updateBank(bank.id, {
                          account_number: e.target.value.replace(/\s+/g, ""),
                        })
                      }
                      placeholder="9-18 digit account number"
                      maxLength={18}
                      error={errors.account_number}
                    />
                    <Input
                      label="IFSC Code *"
                      value={bank.ifsc}
                      onChange={(e) =>
                        updateBank(bank.id, {
                          ifsc: e.target.value.toUpperCase().slice(0, 11),
                        })
                      }
                      placeholder="HDFC0001234"
                      maxLength={11}
                      error={errors.ifsc}
                    />
                    <Input
                      label="Branch"
                      value={bank.branch}
                      onChange={(e) =>
                        updateBank(bank.id, { branch: e.target.value })
                      }
                      placeholder="e.g., Andheri East, Mumbai"
                    />
                    <Select
                      label="Account Type"
                      options={ACCOUNT_TYPES}
                      value={bank.account_type}
                      onChange={(v) => updateBank(bank.id, { account_type: v })}
                    />
                    <Input
                      label="UPI ID (VPA)"
                      value={bank.upi_id}
                      onChange={(e) =>
                        updateBank(bank.id, { upi_id: e.target.value })
                      }
                      placeholder="business@icici"
                      error={errors.upi_id}
                      hint="Optional — used for UPI payments on invoices"
                    />
                    <Input
                      label="SWIFT / BIC Code"
                      value={bank.swift_code}
                      onChange={(e) =>
                        updateBank(bank.id, {
                          swift_code: e.target.value.toUpperCase().slice(0, 11),
                        })
                      }
                      placeholder="HDFCINBB"
                      maxLength={11}
                      error={errors.swift_code}
                      hint="Optional — for international wire transfers"
                    />
                    <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bank.show_full_number}
                        onChange={(e) =>
                          updateBank(bank.id, {
                            show_full_number: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      Show full account number on invoice PDF{" "}
                      <span className="text-gray-500 text-xs">
                        (default masks all but last 4 digits)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {banks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            icon={<Plus className="h-4 w-4" />}
            onClick={addBank}
          >
            Add Bank Account
          </Button>
        )}

        {banks.length > 0 && primaryCount !== 1 && (
          <p className="mt-3 text-sm font-medium text-danger-600">
            Exactly one bank must be marked Primary.
          </p>
        )}
      </Card>

      <div className="flex items-center gap-3 justify-end">
        {success && (
          <span className="text-sm text-success-700">Settings saved!</span>
        )}
        {saveError && (
          <span className="text-sm text-danger-600">{saveError}</span>
        )}
        <Button
          icon={<Save className="h-4 w-4" />}
          onClick={handleSave}
          loading={saving}
          disabled={!banksValid}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
