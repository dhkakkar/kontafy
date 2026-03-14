"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { Save, Landmark, Shield } from "lucide-react";

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

  const [form, setForm] = useState({
    gst_registration_type: "regular",
    gstin: "",
    pan: "",
    filing_frequency: "monthly",
    place_of_supply: "MH",
    enable_tds: false,
    tds_tan: "",
    default_tds_section: "",
  });

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
        place_of_supply: form.place_of_supply,
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
            onChange={(e) => updateField("gstin", e.target.value)}
            placeholder="e.g., 27AABCK1234A1Z5"
            hint="15-character GST Identification Number"
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
          <Select
            label="Place of Supply (State)"
            options={INDIAN_STATES}
            value={form.place_of_supply}
            onChange={(v) => updateField("place_of_supply", v)}
            searchable
          />
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
          <h4 className="text-sm font-medium text-primary-900 mb-2">
            Inter-state vs Intra-state Tax
          </h4>
          <p className="text-sm text-primary-700">
            For intra-state supply (within{" "}
            {INDIAN_STATES.find((s) => s.value === form.place_of_supply)
              ?.label || "your state"}
            ), invoices will show CGST + SGST. For inter-state supply, IGST will
            be applied automatically based on the place of supply.
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
