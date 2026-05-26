"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { Save, Loader2, Wallet, Plus, Info } from "lucide-react";

interface CapitalStructure {
  authorized_capital: number;
  authorized_shares: number;
  face_value: number;
  paid_up_capital: number;
  issued_shares: number;
  share_type: string;
  capital_events: Array<{
    date: string;
    event_type: string;
    amount: number;
    reference?: string;
  }>;
}

const EMPTY: CapitalStructure = {
  authorized_capital: 0,
  authorized_shares: 0,
  face_value: 10,
  paid_up_capital: 0,
  issued_shares: 0,
  share_type: "equity",
  capital_events: [],
};

const SHARE_TYPES = [
  { value: "equity", label: "Equity" },
  { value: "preference", label: "Preference" },
  { value: "mixed", label: "Mixed (Equity + Preference)" },
];

const fmtInr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export default function CapitalStructurePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState<CapitalStructure>(EMPTY);

  useEffect(() => {
    api
      .get<{ data: CapitalStructure }>("/settings/capital")
      .then((res) => {
        const d = (res as any)?.data || res;
        if (d) setForm({ ...EMPTY, ...d });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateNum = (key: keyof CapitalStructure, value: string) => {
    const n = Math.max(0, Number(value) || 0);
    setForm((p) => ({ ...p, [key]: n }));
    setSuccess(false);
    setSaveError("");
  };

  // Cross-checks: authorized capital should roughly equal shares × face
  // value; paid-up should not exceed authorized; issued shares should not
  // exceed authorized shares. We surface mismatches as soft hints rather
  // than blocking save for the share counts because bonus/rights issues
  // can legitimately have slight rounding.
  const checks = useMemo(() => {
    const authCalc = form.authorized_shares * form.face_value;
    const paidCalc = form.issued_shares * form.face_value;
    const authMismatch =
      form.authorized_shares > 0 &&
      form.face_value > 0 &&
      authCalc !== form.authorized_capital;
    const paidMismatch =
      form.issued_shares > 0 &&
      form.face_value > 0 &&
      paidCalc !== form.paid_up_capital;
    const paidOverAuth =
      form.authorized_capital > 0 &&
      form.paid_up_capital > form.authorized_capital;
    const issuedOverAuth =
      form.authorized_shares > 0 && form.issued_shares > form.authorized_shares;
    return {
      authCalc,
      paidCalc,
      authMismatch,
      paidMismatch,
      paidOverAuth,
      issuedOverAuth,
    };
  }, [form]);

  const valid = !checks.paidOverAuth;

  const handleSave = async () => {
    if (!valid) {
      setSaveError(
        "Paid-up capital cannot exceed authorized capital. Adjust either value.",
      );
      return;
    }
    setSaving(true);
    setSuccess(false);
    setSaveError("");
    try {
      await api.patch("/settings/capital", {
        authorized_capital: form.authorized_capital,
        authorized_shares: form.authorized_shares,
        face_value: form.face_value,
        paid_up_capital: form.paid_up_capital,
        issued_shares: form.issued_shares,
        share_type: form.share_type,
      });
      setSuccess(true);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save");
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
      {/* Authorized Capital */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-400" />
            Authorized Capital
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500 mb-4">
          Maximum capital the company can issue per its MoA. This is the upper
          bound — paid-up capital cannot exceed this value.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Total Authorized Capital (₹)"
            type="number"
            min={0}
            value={String(form.authorized_capital)}
            onChange={(e) => updateNum("authorized_capital", e.target.value)}
            leftIcon={<span className="text-gray-500 text-sm">₹</span>}
            placeholder="e.g. 1000000"
          />
          <Input
            label="Number of Authorized Shares"
            type="number"
            min={0}
            value={String(form.authorized_shares)}
            onChange={(e) => updateNum("authorized_shares", e.target.value)}
            placeholder="e.g. 100000"
          />
          <Input
            label="Face Value per Share (₹)"
            type="number"
            min={0}
            value={String(form.face_value)}
            onChange={(e) => updateNum("face_value", e.target.value)}
            leftIcon={<span className="text-gray-500 text-sm">₹</span>}
            placeholder="10"
          />
        </div>
        {checks.authMismatch && (
          <p className="mt-3 text-sm text-amber-700 inline-flex items-start gap-1">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Shares × Face Value = {fmtInr(checks.authCalc)} which differs from
              the entered authorized capital. Verify both values match your MoA.
            </span>
          </p>
        )}
      </Card>

      {/* Paid-Up Capital */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Paid-Up Capital</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500 mb-4">
          Capital actually received from shareholders. Phase 2 will mirror this
          into the &quot;Share Capital&quot; ledger in your chart of accounts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Total Paid-Up Capital (₹)"
            type="number"
            min={0}
            value={String(form.paid_up_capital)}
            onChange={(e) => updateNum("paid_up_capital", e.target.value)}
            leftIcon={<span className="text-gray-500 text-sm">₹</span>}
            placeholder="e.g. 100000"
            error={
              checks.paidOverAuth ? "Cannot exceed authorized capital" : undefined
            }
          />
          <Input
            label="Number of Issued Shares"
            type="number"
            min={0}
            value={String(form.issued_shares)}
            onChange={(e) => updateNum("issued_shares", e.target.value)}
            placeholder="e.g. 10000"
            error={
              checks.issuedOverAuth ? "Exceeds authorized shares" : undefined
            }
          />
          <Select
            label="Share Type"
            options={SHARE_TYPES}
            value={form.share_type}
            onChange={(v) => {
              setForm((p) => ({ ...p, share_type: v }));
              setSuccess(false);
            }}
          />
        </div>
        {checks.paidMismatch && (
          <p className="mt-3 text-sm text-amber-700 inline-flex items-start gap-1">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Issued Shares × Face Value = {fmtInr(checks.paidCalc)} which
              differs from the entered paid-up capital.
            </span>
          </p>
        )}
      </Card>

      {/* Capital Events placeholder — full timeline lands in Phase 2 */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Capital History</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500 mb-4">
          Major capital events like Incorporation, Bonus Issue, Right Issue and
          Buy-back will appear here. Recording events will be available in the
          next release.
        </p>
        {form.capital_events.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">No capital events recorded.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {form.capital_events.map((e, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {e.event_type}
                  </p>
                  <p className="text-xs text-gray-500">{e.date}</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {fmtInr(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          disabled
          className="mt-3"
        >
          Record Capital Event (coming soon)
        </Button>
      </Card>

      <div className="flex items-center gap-3 justify-end">
        {success && (
          <span className="text-sm text-success-700">Capital structure saved</span>
        )}
        {saveError && (
          <span className="text-sm text-danger-600">{saveError}</span>
        )}
        <Button
          icon={<Save className="h-4 w-4" />}
          onClick={handleSave}
          loading={saving}
          disabled={!valid}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
