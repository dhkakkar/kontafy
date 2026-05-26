"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { Save, Landmark, Shield, Loader2, Info } from "lucide-react";

// First two digits of a GSTIN encode the GST state code. We use this to
// auto-derive Place of Supply so the user can't pick something that
// contradicts their registration — picking the wrong state silently
// flips every invoice between CGST+SGST and IGST.
const GST_STATE_CODE_TO_VALUE: Record<string, string> = {
  "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK",
  "06": "HR", "07": "DL", "08": "RJ", "09": "UP", "10": "BR",
  "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ",
  "16": "TR", "17": "ML", "18": "AS", "19": "WB", "20": "JH",
  "21": "OD", "22": "CT", "23": "MP", "24": "GJ", "25": "DN",
  "26": "DN", "27": "MH", "28": "AP", "29": "KA", "30": "GA",
  "31": "LA", "32": "KL", "33": "TN", "34": "PY", "35": "AN",
  "36": "TG", "37": "AP",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const INDIAN_STATES = [
  { value: "AN", label: "Andaman and Nicobar Islands" },
  { value: "AP", label: "Andhra Pradesh" },
  { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" },
  { value: "BR", label: "Bihar" },
  { value: "CH", label: "Chandigarh" },
  { value: "CT", label: "Chhattisgarh" },
  { value: "DN", label: "Dadra & Nagar Haveli and Daman & Diu" },
  { value: "DL", label: "Delhi" },
  { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" },
  { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" },
  { value: "JK", label: "Jammu and Kashmir" },
  { value: "JH", label: "Jharkhand" },
  { value: "KA", label: "Karnataka" },
  { value: "KL", label: "Kerala" },
  { value: "LA", label: "Ladakh" },
  { value: "MP", label: "Madhya Pradesh" },
  { value: "MH", label: "Maharashtra" },
  { value: "MN", label: "Manipur" },
  { value: "ML", label: "Meghalaya" },
  { value: "MZ", label: "Mizoram" },
  { value: "NL", label: "Nagaland" },
  { value: "OD", label: "Odisha" },
  { value: "PB", label: "Punjab" },
  { value: "PY", label: "Puducherry" },
  { value: "RJ", label: "Rajasthan" },
  { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" },
  { value: "TG", label: "Telangana" },
  { value: "TR", label: "Tripura" },
  { value: "UP", label: "Uttar Pradesh" },
  { value: "UK", label: "Uttarakhand" },
  { value: "WB", label: "West Bengal" },
];

const TDS_SECTIONS = [
  { value: "194A", label: "194A - Interest other than on securities" },
  { value: "194C", label: "194C - Contractor payments" },
  { value: "194H", label: "194H - Commission or brokerage" },
  { value: "194I", label: "194I - Rent" },
  { value: "194J", label: "194J - Professional/technical fees" },
  { value: "194Q", label: "194Q - Purchase of goods" },
];

export default function TaxSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    gst_registration_type: "regular",
    gstin: "",
    pan: "",
    filing_frequency: "monthly",
    // place_of_supply is no longer user-editable — it is derived from the
    // first two digits of GSTIN at save time. Keeping the key in state so
    // we can still display it and send the correct value to the backend.
    place_of_supply: "",
    enable_tds: false,
    tds_tan: "",
    default_tds_section: "",
  });

  useEffect(() => {
    api
      .get<{ data: Record<string, unknown> }>("/settings/tax")
      .then((res) => {
        const d = res.data;
        if (d) {
          const gstin = String(d.gstin || "").toUpperCase();
          // If the backend has a stale or wrong place_of_supply (e.g. the
          // historic hardcoded "MH"), prefer the one derived from GSTIN so
          // CGST/SGST vs IGST stays consistent with the registration.
          const derived = gstin.length >= 2
            ? GST_STATE_CODE_TO_VALUE[gstin.slice(0, 2)] || ""
            : "";
          setForm((prev) => ({
            ...prev,
            gst_registration_type: String(d.gst_registration_type || prev.gst_registration_type),
            gstin,
            pan: String(d.pan || ""),
            filing_frequency: String(d.filing_frequency || prev.filing_frequency),
            place_of_supply: derived || String(d.place_of_supply || ""),
            enable_tds: Boolean(d.enable_tds),
            tds_tan: String(d.tds_tan || ""),
            default_tds_section: String(d.default_tds_section || ""),
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Always recompute Place of Supply from the live GSTIN so the badge and
  // the inter-state hint stay in sync as the user types or pastes a GSTIN.
  const derivedPlaceOfSupply = useMemo(() => {
    const g = (form.gstin || "").toUpperCase();
    if (g.length < 2) return "";
    return GST_STATE_CODE_TO_VALUE[g.slice(0, 2)] || "";
  }, [form.gstin]);

  const isGstinValid = useMemo(
    () => GSTIN_REGEX.test((form.gstin || "").toUpperCase()),
    [form.gstin],
  );

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch("/settings/tax", {
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
        gst_registration_type: form.gst_registration_type,
        filing_frequency: form.filing_frequency,
        // Always send the GSTIN-derived value, never the form state — this
        // is the bug fix: previously the dropdown allowed the user to save
        // a place_of_supply that contradicted their GSTIN.
        place_of_supply: derivedPlaceOfSupply || undefined,
        enable_tds: form.enable_tds,
        tds_tan: form.tds_tan || undefined,
        default_tds_section: form.default_tds_section || undefined,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Failed to save tax settings:", err);
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
      {/* GST Registration */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-gray-400" />
            GST Registration
          </CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="GST Registration Type"
            options={[
              { value: "regular", label: "Regular" },
              {
                value: "composition",
                label: "Composition Scheme",
                description: "For businesses with turnover up to Rs. 1.5 Cr",
              },
              {
                value: "unregistered",
                label: "Unregistered",
                description: "Below GST threshold",
              },
            ]}
            value={form.gst_registration_type}
            onChange={(v) => updateField("gst_registration_type", v)}
          />
          <Input
            label="GSTIN"
            value={form.gstin}
            onChange={(e) =>
              updateField(
                "gstin",
                e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 15),
              )
            }
            placeholder="e.g., 27AABCK1234A1Z5"
            hint="15-character GST Identification Number"
            maxLength={15}
            error={
              form.gstin && !isGstinValid
                ? "Invalid GSTIN format"
                : undefined
            }
            disabled={form.gst_registration_type === "unregistered"}
          />
          <Input
            label="PAN"
            value={form.pan}
            onChange={(e) => updateField("pan", e.target.value)}
            placeholder="e.g., AABCK1234A"
            hint="10-character Permanent Account Number"
          />
          <Select
            label="Filing Frequency"
            options={[
              {
                value: "monthly",
                label: "Monthly",
                description: "GSTR-1 & GSTR-3B every month",
              },
              {
                value: "quarterly",
                label: "Quarterly (QRMP)",
                description: "For businesses with turnover up to Rs. 5 Cr",
              },
            ]}
            value={form.filing_frequency}
            onChange={(v) => updateField("filing_frequency", v)}
            disabled={form.gst_registration_type === "unregistered"}
          />
          {/* Place of Supply is now read-only and auto-derived from GSTIN
              chars 1-2. Earlier this was an editable dropdown defaulting
              to "MH" which caused every GST calc to be wrong when the
              company GSTIN wasn't a Maharashtra one. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Place of Supply (State)
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="Auto-derived from the first two digits of your GSTIN. Edit GSTIN to change."
              >
                ⓘ
              </span>
            </label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm">
              {derivedPlaceOfSupply ? (
                <>
                  <span className="font-mono text-xs text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                    {(form.gstin || "").slice(0, 2) || "—"}
                  </span>
                  <span className="font-medium text-gray-900">
                    {INDIAN_STATES.find(
                      (s) => s.value === derivedPlaceOfSupply,
                    )?.label || derivedPlaceOfSupply}
                  </span>
                </>
              ) : (
                <span className="text-gray-500 inline-flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Enter a valid GSTIN to auto-detect
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
          <h4 className="text-sm font-medium text-primary-900 mb-2">
            Inter-state vs Intra-state Tax
          </h4>
          <p className="text-sm text-primary-700">
            {derivedPlaceOfSupply ? (
              <>
                Place of Supply is{" "}
                <strong>
                  {INDIAN_STATES.find((s) => s.value === derivedPlaceOfSupply)
                    ?.label || derivedPlaceOfSupply}
                </strong>{" "}
                (from GSTIN). Intra-state invoices will use CGST + SGST;
                inter-state will use IGST. The split is decided automatically
                per invoice based on the customer&apos;s state.
              </>
            ) : (
              <>
                Enter a valid GSTIN above to enable automatic CGST/SGST vs
                IGST classification on invoices.
              </>
            )}
          </p>
        </div>
      </Card>

      {/* TDS Settings */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            TDS Settings
          </CardTitle>
        </CardHeader>

        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Enable TDS (Tax Deducted at Source)
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Track TDS deductions on vendor payments
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.enable_tds}
              onClick={() => updateField("enable_tds", !form.enable_tds)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                form.enable_tds ? "bg-primary-800" : "bg-gray-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  form.enable_tds ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {form.enable_tds && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="TAN (Tax Deduction Account Number)"
                value={form.tds_tan}
                onChange={(e) => updateField("tds_tan", e.target.value)}
                placeholder="e.g., MUMA12345B"
                hint="10-character TAN"
              />
              <Select
                label="Default TDS Section"
                options={TDS_SECTIONS}
                value={form.default_tds_section}
                onChange={(v) => updateField("default_tds_section", v)}
                placeholder="Select section"
              />
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center gap-3 justify-end">
        {success && (
          <span className="text-sm text-success-700">Settings saved!</span>
        )}
        <Button
          icon={<Save className="h-4 w-4" />}
          onClick={handleSave}
          loading={saving}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
