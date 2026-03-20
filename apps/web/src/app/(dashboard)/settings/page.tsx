"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";
import { Save, Upload, Building2, Loader2 } from "lucide-react";

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

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function OrganizationSettingsPage() {
  const { organization, setOrganization } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: organization?.name || "",
    legal_name: "",
    gstin: organization?.gstin || "",
    pan: "",
    cin: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    website: "",
    fiscal_year_start: String(organization?.financialYearStart || 4),
  });

  // Load existing settings from API on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ data: any }>("/settings/organization");
        const org = res.data || res;
        setForm((prev) => ({
          ...prev,
          name: org.name || prev.name,
          legal_name: org.legal_name || "",
          gstin: org.gstin || prev.gstin,
          pan: org.pan || "",
          cin: org.cin || "",
          address_line1: org.address?.line1 || "",
          address_line2: org.address?.line2 || "",
          city: org.address?.city || "",
          state: org.address?.state || "",
          pincode: org.address?.pincode || "",
          phone: org.phone || "",
          email: org.email || "",
          website: org.website || "",
          fiscal_year_start: String(org.fiscal_year_start || org.financialYearStart || 4),
        }));
      } catch {
        // Fall back to auth store values
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch("/settings/organization", {
        name: form.name,
        legal_name: form.legal_name || undefined,
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
        cin: form.cin || undefined,
        address: {
          line1: form.address_line1,
          line2: form.address_line2,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        phone: form.phone || undefined,
        email: form.email || undefined,
        fiscal_year_start: parseInt(form.fiscal_year_start),
      });
      // Update auth store so header reflects new name immediately
      if (organization) {
        setOrganization({
          ...organization,
          name: form.name,
          gstin: form.gstin || undefined,
          financialYearStart: parseInt(form.fiscal_year_start),
        });
      }
      setSuccess(true);
    } catch (err) {
      console.error("Failed to save organization settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card padding="md">
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            Organization Profile
          </CardTitle>
        </CardHeader>

        {/* Logo Upload */}
        <div className="flex items-center gap-6 mb-6">
          <div className="h-20 w-20 rounded-2xl bg-primary-50 flex items-center justify-center border-2 border-dashed border-primary-200">
            <span className="text-2xl font-bold text-primary-800">
              {form.name ? form.name[0].toUpperCase() : "K"}
            </span>
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
            >
              Upload Logo
            </Button>
            <p className="text-xs text-gray-500 mt-1.5">
              PNG, JPG up to 2MB. Recommended: 200x200px
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Your company name"
          />
          <Input
            label="Legal Name"
            value={form.legal_name}
            onChange={(e) => updateField("legal_name", e.target.value)}
            placeholder="Registered legal name"
          />
          <Input
            label="GSTIN"
            value={form.gstin}
            onChange={(e) => updateField("gstin", e.target.value)}
            placeholder="15-character GSTIN"
            hint="e.g., 27AABCK1234A1Z5"
          />
          <Input
            label="PAN"
            value={form.pan}
            onChange={(e) => updateField("pan", e.target.value)}
            placeholder="10-character PAN"
            hint="e.g., AABCK1234A"
          />
          <Input
            label="CIN"
            value={form.cin}
            onChange={(e) => updateField("cin", e.target.value)}
            placeholder="21-character CIN (optional)"
          />
        </div>

        {/* Address */}
        <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">
          Registered Address
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Address Line 1"
              value={form.address_line1}
              onChange={(e) => updateField("address_line1", e.target.value)}
              placeholder="Street address, building name"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Address Line 2"
              value={form.address_line2}
              onChange={(e) => updateField("address_line2", e.target.value)}
              placeholder="Area, landmark (optional)"
            />
          </div>
          <Input
            label="City"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="City"
          />
          <Select
            label="State"
            options={INDIAN_STATES}
            value={form.state}
            onChange={(v) => updateField("state", v)}
            searchable
            placeholder="Select state"
          />
          <Input
            label="Pincode"
            value={form.pincode}
            onChange={(e) => updateField("pincode", e.target.value)}
            placeholder="6-digit pincode"
          />
        </div>

        {/* Contact */}
        <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">
          Contact Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="+91 XXXXX XXXXX"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="accounts@company.in"
          />
          <Input
            label="Website"
            value={form.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://company.in"
          />
          <Select
            label="Financial Year Start"
            options={MONTHS}
            value={form.fiscal_year_start}
            onChange={(v) => updateField("fiscal_year_start", v)}
          />
        </div>

        <div className="flex items-center gap-3 justify-end mt-6">
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
      </Card>
    </div>
  );
}
