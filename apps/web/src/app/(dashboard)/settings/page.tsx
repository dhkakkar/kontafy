"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";
import { Save, Upload, Building2, Loader2, Search } from "lucide-react";

// GST state code to state abbreviation mapping
const GST_STATE_CODE_MAP: Record<string, string> = {
  "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK",
  "06": "HR", "07": "DL", "08": "RJ", "09": "UP", "10": "BR",
  "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ",
  "16": "TR", "17": "ML", "18": "AS", "19": "WB", "20": "JH",
  "21": "OD", "22": "CT", "23": "MP", "24": "GJ", "25": "DN",
  "26": "DN", "27": "MH", "28": "AP", "29": "KA", "30": "GA",
  "31": "LA", "32": "KL", "33": "TN", "34": "PY", "35": "AN",
  "36": "TG", "37": "AP",
};

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
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinError, setGstinError] = useState("");

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

  const [logoUrl, setLogoUrl] = useState<string | null>(
    (organization as any)?.logoUrl || null,
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (!file) return;

    setLogoError("");

    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("File too large. Max 2MB.");
      return;
    }

    setLogoUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const response = await api.post<{
        data?: { logo_url?: string };
        logo_url?: string;
      }>("/settings/organization/logo", { data_url: dataUrl });

      const finalUrl =
        response?.data?.logo_url || response?.logo_url || null;
      if (!finalUrl) {
        setLogoError("Upload succeeded but no URL was returned.");
        return;
      }
      setLogoUrl(finalUrl);
    } catch (err: any) {
      setLogoError(err?.message || "Failed to upload logo");
    } finally {
      setLogoUploading(false);
    }
  };

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
        if (org.logo_url) setLogoUrl(org.logo_url);
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

  const handleGstinLookup = async () => {
    const gstin = form.gstin.trim().toUpperCase();
    if (!gstin || gstin.length !== 15) {
      setGstinError("Please enter a valid 15-character GSTIN");
      return;
    }
    setGstinLoading(true);
    setGstinError("");
    try {
      const res = await fetch(`https://sheet.gstincheck.co.in/check/free/${gstin}`);
      const json = await res.json();
      if (!json.flag) {
        setGstinError(json.message || "Invalid GSTIN or lookup failed");
        return;
      }
      const data = json.data;
      const addr = data.pradr?.addr || {};
      const stateCode = addr.stcd ? GST_STATE_CODE_MAP[addr.stcd] || "" : "";
      const addressParts = [addr.flno, addr.bno, addr.st].filter(Boolean);
      setForm((prev) => ({
        ...prev,
        legal_name: data.lgnm || prev.legal_name,
        pan: gstin.substring(2, 12),
        state: stateCode || prev.state,
        city: addr.loc || prev.city,
        pincode: addr.pncd || prev.pincode,
        address_line1: addressParts.join(", ") || prev.address_line1,
      }));
    } catch (err) {
      setGstinError("Failed to fetch GSTIN details. Please try again.");
    } finally {
      setGstinLoading(false);
    }
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
          <div className="h-20 w-20 rounded-2xl bg-primary-50 flex items-center justify-center border-2 border-dashed border-primary-200 overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo"
                className="h-20 w-20 object-contain rounded-2xl"
              />
            ) : (
              <span className="text-2xl font-bold text-primary-800">
                {form.name ? form.name[0].toUpperCase() : "K"}
              </span>
            )}
          </div>
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
              variant="outline"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
              onClick={() => logoInputRef.current?.click()}
              loading={logoUploading}
            >
              Upload Logo
            </Button>
            <p className="text-xs text-gray-500 mt-1.5">
              PNG, JPG, WEBP, or SVG up to 2MB. Recommended: 200x200px
            </p>
            {logoError && (
              <p className="text-xs text-danger-600 mt-1">{logoError}</p>
            )}
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
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="GSTIN"
                  value={form.gstin}
                  onChange={(e) => updateField("gstin", e.target.value)}
                  placeholder="15-character GSTIN"
                  hint={gstinError || "e.g., 27AABCK1234A1Z5"}
                  error={gstinError || undefined}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGstinLookup}
                disabled={gstinLoading || !form.gstin.trim()}
                icon={gstinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                className="mb-[2px]"
              >
                {gstinLoading ? "Fetching..." : "Get Details"}
              </Button>
            </div>
          </div>
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
