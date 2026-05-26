"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";
import {
  Save,
  Upload,
  Building2,
  Loader2,
  Search,
  CheckCircle2,
  Undo2,
  ExternalLink,
} from "lucide-react";

// First two digits of a GSTIN identify the state under GST place-of-supply
// rules. We map them to the dropdown value used by our State Select.
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

const BUSINESS_TYPES = [
  { value: "proprietorship", label: "Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llp", label: "LLP" },
  { value: "pvt_ltd", label: "Private Limited Company" },
  { value: "public_ltd", label: "Public Limited Company" },
  { value: "opc", label: "One Person Company" },
  { value: "huf", label: "HUF" },
  { value: "trust", label: "Trust" },
  { value: "society", label: "Society" },
  { value: "other", label: "Other" },
];

const INDUSTRIES = [
  { value: "it", label: "IT / Digital Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "trading", label: "Trading" },
  { value: "consulting", label: "Consulting" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "hospitality", label: "Hospitality" },
  { value: "construction", label: "Construction" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
];

// Business types that legally need a CIN (companies registered with MCA).
// LLP gets an LLPIN which we accept in the same field for simplicity.
const TYPES_REQUIRING_CIN = new Set(["pvt_ltd", "public_ltd", "opc", "llp"]);
// Companies/LLPs/Partnerships almost always have a TAN because they deduct
// TDS; Proprietorships and HUFs may not, so don't force TAN on them.
const TYPES_REQUIRING_TAN = new Set([
  "pvt_ltd",
  "public_ltd",
  "opc",
  "llp",
  "partnership",
]);
// Date of Incorporation is a registered MCA fact only for incorporated
// entities; Proprietorships/HUFs don't have one.
const TYPES_REQUIRING_DOI = new Set([
  "pvt_ltd",
  "public_ltd",
  "opc",
  "llp",
]);

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
const CIN_REGEX = /^[LUu]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/i;
const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

function panFromGstin(gstin: string): string {
  return gstin.slice(2, 12).toUpperCase();
}

function stateCodeFromGstin(gstin: string): string {
  if (gstin.length < 2) return "";
  return GST_STATE_CODE_MAP[gstin.slice(0, 2)] || "";
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ProfileForm {
  name: string;
  legal_name: string;
  gstin: string;
  pan: string;
  cin: string;
  tan: string;
  business_type: string;
  industry: string;
  currency: string;
  date_of_incorporation: string;
  gst_registration_date: string;
  books_begin_from: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string; // stored as 10 digits without country code; displayed with +91
  email: string;
  website: string;
  fiscal_year_start: string;
}

const EMPTY_FORM: ProfileForm = {
  name: "",
  legal_name: "",
  gstin: "",
  pan: "",
  cin: "",
  tan: "",
  business_type: "",
  industry: "",
  currency: "INR",
  date_of_incorporation: "",
  gst_registration_date: "",
  books_begin_from: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
  website: "",
  fiscal_year_start: "4",
};

type GstinVerification = {
  verifiedAt: string;
  legalName?: string;
  status?: string;
};

const GSTIN_CACHE_PREFIX = "kontafy:gstin-verify:";
const GSTIN_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readGstinCache(gstin: string): GstinVerification | null {
  try {
    const raw = localStorage.getItem(GSTIN_CACHE_PREFIX + gstin);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GstinVerification;
    if (Date.now() - new Date(parsed.verifiedAt).getTime() > GSTIN_CACHE_TTL_MS)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeGstinCache(gstin: string, v: GstinVerification) {
  try {
    localStorage.setItem(GSTIN_CACHE_PREFIX + gstin, JSON.stringify(v));
  } catch {
    // localStorage can throw in private-mode iframes; silent
  }
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { organization, setOrganization } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinError, setGstinError] = useState("");
  const [gstinVerified, setGstinVerified] = useState<GstinVerification | null>(
    null,
  );
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeWarning, setPincodeWarning] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // panEditedByUser tracks whether the user has hand-edited PAN. Until they
  // do we keep PAN in sync with whatever GSTIN encodes; once edited we stop
  // overwriting it and start warning on mismatch instead.
  const [panEditedByUser, setPanEditedByUser] = useState(false);
  const [stateEditedByUser, setStateEditedByUser] = useState(false);

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  // Snapshot of last-saved values so Discard / unsaved-changes detection
  // can compare against truth, not initial empty state.
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY_FORM);

  const [logoUrl, setLogoUrl] = useState<string | null>(
    (organization as any)?.logoUrl || null,
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────
  // Load
  // ─────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ data: any }>("/settings/organization");
        const org = res.data || res;
        const profile = org?.settings?.profile || {};
        const loaded: ProfileForm = {
          name: org.name || "",
          legal_name: org.legal_name || "",
          gstin: org.gstin || "",
          pan: org.pan || "",
          cin: org.cin || "",
          tan: profile.tan || "",
          business_type: org.business_type || "",
          industry: org.industry || "",
          currency: org.currency || "INR",
          date_of_incorporation: profile.date_of_incorporation || "",
          gst_registration_date: profile.gst_registration_date || "",
          books_begin_from: profile.books_begin_from || "",
          address_line1: org.address?.line1 || "",
          address_line2: org.address?.line2 || "",
          city: org.address?.city || "",
          state: org.address?.state || "",
          pincode: org.address?.pincode || "",
          phone: (org.phone || "").replace(/\D/g, "").slice(-10),
          email: org.email || "",
          website: profile.website || "",
          fiscal_year_start: String(org.fiscal_year_start || 4),
        };
        setForm(loaded);
        setSavedForm(loaded);
        if (org.logo_url) setLogoUrl(org.logo_url);
        if (loaded.gstin) {
          const cached = readGstinCache(loaded.gstin);
          if (cached) setGstinVerified(cached);
        }
      } catch {
        // fall back to auth store defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  // ─────────────────────────────────────────────────────
  // Unsaved-changes warning on page unload
  // ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required by Chrome for the native dialog to appear.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ─────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────

  const cinRequired = TYPES_REQUIRING_CIN.has(form.business_type);
  const tanRequired = TYPES_REQUIRING_TAN.has(form.business_type);
  const doiRequired = TYPES_REQUIRING_DOI.has(form.business_type);

  const derivedStateFromGstin = stateCodeFromGstin(form.gstin);

  const errors: Record<string, string> = {};
  if (touched.name && !form.name.trim()) errors.name = "Company name is required";
  if (touched.gstin && form.gstin && !GSTIN_REGEX.test(form.gstin))
    errors.gstin = "Invalid GSTIN format (15 chars, e.g. 27AAFCT1234A1Z5)";
  if (touched.pan) {
    if (!form.pan.trim()) errors.pan = "PAN is required";
    else if (!PAN_REGEX.test(form.pan)) errors.pan = "Invalid PAN format";
    else if (
      form.gstin &&
      GSTIN_REGEX.test(form.gstin) &&
      panFromGstin(form.gstin) !== form.pan
    )
      errors.pan = "PAN does not match the PAN embedded in GSTIN";
  }
  if (touched.cin && cinRequired && !form.cin.trim())
    errors.cin = "CIN is required for this business type";
  if (touched.cin && form.cin && !CIN_REGEX.test(form.cin))
    errors.cin = "Invalid CIN format (21 chars)";
  if (touched.tan && tanRequired && !form.tan.trim())
    errors.tan = "TAN is required for this business type";
  if (touched.tan && form.tan && !TAN_REGEX.test(form.tan))
    errors.tan = "Invalid TAN format (4 letters + 5 digits + 1 letter)";
  if (touched.email && form.email && !EMAIL_REGEX.test(form.email))
    errors.email = "Enter a valid email";
  if (touched.phone && form.phone && !PHONE_REGEX.test(form.phone))
    errors.phone = "10-digit Indian mobile starting with 6/7/8/9";
  if (touched.pincode && form.pincode && !PINCODE_REGEX.test(form.pincode))
    errors.pincode = "6-digit Indian pincode";
  if (touched.date_of_incorporation) {
    if (doiRequired && !form.date_of_incorporation)
      errors.date_of_incorporation =
        "Date of Incorporation is required for this business type";
    else if (form.date_of_incorporation && form.date_of_incorporation > todayIso())
      errors.date_of_incorporation = "Cannot be a future date";
  }
  if (touched.books_begin_from && form.books_begin_from) {
    if (form.books_begin_from > todayIso())
      errors.books_begin_from = "Cannot be a future date";
    else if (
      form.date_of_incorporation &&
      form.books_begin_from < form.date_of_incorporation
    )
      errors.books_begin_from =
        "Cannot be before Date of Incorporation";
  }
  if (touched.gst_registration_date) {
    if (form.gstin && !form.gst_registration_date)
      errors.gst_registration_date =
        "GST Registration Date is required when GSTIN is set";
    else if (
      form.gst_registration_date &&
      form.date_of_incorporation &&
      form.gst_registration_date < form.date_of_incorporation
    )
      errors.gst_registration_date =
        "Cannot be before Date of Incorporation";
    else if (form.gst_registration_date && form.gst_registration_date > todayIso())
      errors.gst_registration_date = "Cannot be a future date";
  }
  if (touched.website && form.website) {
    try {
      const url = form.website.match(/^https?:\/\//i)
        ? form.website
        : `https://${form.website}`;
      new URL(url);
    } catch {
      errors.website = "Enter a valid URL";
    }
  }

  // ─────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────

  const updateField = <K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setSaveError("");
  };

  const handleGstinChange = (raw: string) => {
    const v = raw.toUpperCase().replace(/\s/g, "").slice(0, 15);
    setForm((s) => ({
      ...s,
      gstin: v,
      pan: panEditedByUser ? s.pan : panFromGstin(v),
      state: stateEditedByUser ? s.state : (stateCodeFromGstin(v) || s.state),
    }));
    // If GSTIN changed materially, any previous verification badge no longer
    // applies — clear it so the user knows to re-verify.
    if (gstinVerified && v !== form.gstin) setGstinVerified(null);
    setSuccess(false);
  };

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

  const handleGstinLookup = async () => {
    const gstin = form.gstin.trim().toUpperCase();
    setGstinError("");
    if (!GSTIN_REGEX.test(gstin)) {
      setGstinError("Please enter a valid 15-character GSTIN");
      setTouched((t) => ({ ...t, gstin: true }));
      return;
    }

    const cached = readGstinCache(gstin);
    if (cached) {
      setGstinVerified(cached);
      return;
    }

    setGstinLoading(true);
    try {
      const res = await fetch(
        `https://sheet.gstincheck.co.in/check/free/${gstin}`,
      );
      const json = await res.json();
      if (!json.flag) {
        const msg = (json.message || "").toLowerCase();
        if (msg.includes("cancel"))
          setGstinError("GSTIN status is Cancelled");
        else if (msg.includes("suspend"))
          setGstinError("GSTIN status is Suspended");
        else if (msg.includes("invalid"))
          setGstinError("Invalid GSTIN — not found in GST registry");
        else setGstinError(json.message || "Lookup failed");
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
        gst_registration_date: data.rgdt
          ? // GSTN returns DD/MM/YYYY — flip to ISO for the date picker
            data.rgdt.split("/").reverse().join("-")
          : prev.gst_registration_date,
      }));
      const verification: GstinVerification = {
        verifiedAt: new Date().toISOString(),
        legalName: data.lgnm,
        status: data.sts,
      };
      writeGstinCache(gstin, verification);
      setGstinVerified(verification);
    } catch {
      setGstinError("Failed to fetch GSTIN details. Please try again.");
    } finally {
      setGstinLoading(false);
    }
  };

  const handlePincodeLookup = async (pincode: string) => {
    setPincodeWarning("");
    if (!PINCODE_REGEX.test(pincode)) return;
    setPincodeLoading(true);
    try {
      const res = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`,
      );
      const json = await res.json();
      const office = json?.[0]?.PostOffice?.[0];
      if (!office) return;
      const cityFromApi = office.District || office.Name;
      const stateNameFromApi = (office.State || "").trim();
      const stateValue =
        INDIAN_STATES.find(
          (s) => s.label.toLowerCase() === stateNameFromApi.toLowerCase(),
        )?.value || "";
      setForm((prev) => ({
        ...prev,
        city: cityFromApi || prev.city,
        state: stateEditedByUser ? prev.state : stateValue || prev.state,
      }));
      // If GSTIN-derived state and pincode-derived state disagree, surface
      // it — most likely the user picked the wrong pincode or wrong GSTIN.
      if (
        derivedStateFromGstin &&
        stateValue &&
        derivedStateFromGstin !== stateValue
      ) {
        setPincodeWarning(
          `Pincode state (${stateNameFromApi}) doesn't match GSTIN state. Verify which is correct.`,
        );
      }
    } catch {
      // network failure is non-fatal — user can still type City/State manually
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleDiscard = () => {
    if (!isDirty) return;
    if (!confirm("Discard your changes?")) return;
    setForm(savedForm);
    setTouched({});
    setSuccess(false);
    setSaveError("");
    setPanEditedByUser(false);
    setStateEditedByUser(false);
  };

  const handleSave = async () => {
    // Mark every interactive field as touched so any remaining errors render.
    setTouched({
      name: true,
      gstin: true,
      pan: true,
      cin: true,
      tan: true,
      email: true,
      phone: true,
      pincode: true,
      date_of_incorporation: true,
      books_begin_from: true,
      gst_registration_date: true,
      website: true,
    });
    if (Object.keys(errors).length > 0) {
      setSaveError("Please fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    setSuccess(false);
    setSaveError("");

    // Normalise website to include a scheme so links elsewhere don't break.
    let website = form.website.trim();
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        pan: form.pan.trim() || undefined,
        cin: form.cin.trim() || undefined,
        tan: form.tan.trim() || undefined,
        business_type: form.business_type || undefined,
        industry: form.industry || undefined,
        currency: form.currency || "INR",
        date_of_incorporation: form.date_of_incorporation || undefined,
        gst_registration_date: form.gst_registration_date || undefined,
        books_begin_from: form.books_begin_from || undefined,
        address: {
          line1: form.address_line1,
          line2: form.address_line2,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        email: form.email.trim() || undefined,
        website: website || undefined,
        fiscal_year_start: parseInt(form.fiscal_year_start) || 4,
      };
      // Backend stores phone as an E.164-ish string; send +91-prefixed when present.
      if (form.phone && PHONE_REGEX.test(form.phone))
        payload.phone = `+91${form.phone}`;
      else if (!form.phone) payload.phone = undefined;

      await api.patch("/settings/organization", payload);

      if (organization) {
        setOrganization({
          ...organization,
          name: form.name,
          gstin: form.gstin || undefined,
          financialYearStart: parseInt(form.fiscal_year_start),
        });
      }
      setSavedForm(form);
      setSuccess(true);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save settings");
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

        {/* Identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name *"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="Your company name"
            error={errors.name}
          />
          <Input
            label="Legal Name"
            value={form.legal_name}
            onChange={(e) => updateField("legal_name", e.target.value)}
            placeholder="Registered legal name"
          />

          <Select
            label="Business Type"
            options={BUSINESS_TYPES}
            value={form.business_type}
            onChange={(v) => updateField("business_type", v)}
            placeholder="Select business type"
          />

          <Select
            label="Industry"
            options={INDUSTRIES}
            value={form.industry}
            onChange={(v) => updateField("industry", v)}
            placeholder="Select industry"
          />

          {/* GSTIN with Get Details + verification badge */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              GSTIN
              <span
                className="ml-1 text-gray-400 cursor-help"
                title="15-character GST identifier, e.g., 03AAFCT1234A1Z5"
              >
                ⓘ
              </span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={form.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, gstin: true }))}
                  placeholder="27AAFCT1234A1Z5"
                  maxLength={15}
                  error={errors.gstin}
                  hint={
                    !errors.gstin && form.gstin && GSTIN_REGEX.test(form.gstin)
                      ? `State auto-detected from GSTIN`
                      : undefined
                  }
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGstinLookup}
                disabled={gstinLoading || !form.gstin.trim()}
                icon={
                  gstinLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )
                }
                className="mt-[2px] shrink-0"
              >
                {gstinLoading ? "Fetching" : "Get Details"}
              </Button>
            </div>
            {gstinError && (
              <p className="mt-1 text-sm font-medium text-danger-600">
                {gstinError}
              </p>
            )}
            {gstinVerified && !gstinError && (
              <p className="mt-1 text-sm text-success-700 inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                GSTIN Verified
                <span className="text-gray-500 font-normal">
                  · {new Date(gstinVerified.verifiedAt).toLocaleDateString("en-IN")}
                </span>
              </p>
            )}
          </div>

          <Input
            label="PAN *"
            value={form.pan}
            onChange={(e) => {
              setPanEditedByUser(true);
              updateField("pan", e.target.value.toUpperCase().slice(0, 10));
            }}
            onBlur={() => setTouched((t) => ({ ...t, pan: true }))}
            placeholder="AAFCT1234A"
            maxLength={10}
            error={errors.pan}
            hint="10-character Permanent Account Number"
          />

          <Input
            label={`CIN ${cinRequired ? "*" : "(optional)"}`}
            value={form.cin}
            onChange={(e) => updateField("cin", e.target.value.toUpperCase())}
            onBlur={() => setTouched((t) => ({ ...t, cin: true }))}
            placeholder="21-character CIN"
            maxLength={21}
            error={errors.cin}
            hint="Corporate Identification Number (companies only)"
          />

          <Input
            label={`TAN ${tanRequired ? "*" : "(optional)"}`}
            value={form.tan}
            onChange={(e) =>
              updateField("tan", e.target.value.toUpperCase().slice(0, 10))
            }
            onBlur={() => setTouched((t) => ({ ...t, tan: true }))}
            placeholder="PTLT12345E"
            maxLength={10}
            error={errors.tan}
            hint="10-character Tax Deduction Account Number"
          />

          <Input
            label={`Date of Incorporation ${doiRequired ? "*" : "(optional)"}`}
            type="date"
            value={form.date_of_incorporation}
            max={todayIso()}
            onChange={(e) =>
              updateField("date_of_incorporation", e.target.value)
            }
            onBlur={() =>
              setTouched((t) => ({ ...t, date_of_incorporation: true }))
            }
            error={errors.date_of_incorporation}
          />

          <Input
            label={`GST Registration Date ${form.gstin ? "*" : "(optional)"}`}
            type="date"
            value={form.gst_registration_date}
            max={todayIso()}
            onChange={(e) =>
              updateField("gst_registration_date", e.target.value)
            }
            onBlur={() =>
              setTouched((t) => ({ ...t, gst_registration_date: true }))
            }
            error={errors.gst_registration_date}
          />

          <Input
            label="Books Begin From"
            type="date"
            value={form.books_begin_from}
            max={todayIso()}
            onChange={(e) => updateField("books_begin_from", e.target.value)}
            onBlur={() =>
              setTouched((t) => ({ ...t, books_begin_from: true }))
            }
            error={errors.books_begin_from}
            hint="Date from which your accounting data starts in this software"
          />

          <Select
            label="Base Currency"
            options={CURRENCIES}
            value={form.currency}
            onChange={(v) => updateField("currency", v)}
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
              label="Landmark / Area (Optional)"
              value={form.address_line2}
              onChange={(e) => updateField("address_line2", e.target.value)}
              placeholder="e.g., Near Bus Stand, Sector 17"
            />
          </div>
          <Input
            label="Pincode"
            value={form.pincode}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              updateField("pincode", v);
              if (v.length === 6) handlePincodeLookup(v);
            }}
            onBlur={() => setTouched((t) => ({ ...t, pincode: true }))}
            placeholder="6-digit pincode"
            maxLength={6}
            error={errors.pincode}
            rightIcon={
              pincodeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : undefined
            }
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="City"
          />
          <div className="md:col-span-2">
            <Select
              label="State"
              options={INDIAN_STATES}
              value={form.state}
              onChange={(v) => {
                setStateEditedByUser(true);
                updateField("state", v);
              }}
              searchable
              placeholder="Select state"
            />
            {pincodeWarning && (
              <p className="mt-1 text-sm font-medium text-amber-700">
                {pincodeWarning}
              </p>
            )}
            {derivedStateFromGstin &&
              form.state &&
              derivedStateFromGstin !== form.state && (
                <p className="mt-1 text-sm font-medium text-amber-700">
                  State doesn&apos;t match the state encoded in GSTIN.
                </p>
              )}
          </div>
        </div>

        {/* Branches link — Additional Places of Business live on the Branches
            page, which already supports the full Branch/Warehouse model. */}
        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-sm text-gray-700">
            Additional places of business (branches, warehouses, godowns) are
            managed under{" "}
            <Link
              href="/branches"
              className="font-medium text-primary-700 hover:text-primary-900 inline-flex items-center gap-1"
            >
              Branches <ExternalLink className="h-3 w-3" />
            </Link>
            .
          </p>
        </div>

        {/* Contact */}
        <h4 className="text-sm font-semibold text-gray-700 mt-6 mb-3">
          Contact Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Phone"
            leftIcon={<span className="text-gray-500 text-sm">+91</span>}
            value={formatPhoneDisplay(form.phone)}
            onChange={(e) =>
              updateField("phone", e.target.value.replace(/\D/g, "").slice(-10))
            }
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            placeholder="98765 43210"
            maxLength={11}
            error={errors.phone}
          />
          <Input
            label="Organization Email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="accounts@company.in"
            error={errors.email}
            hint="Appears on invoices and customer communication — different from your login email"
          />
          <Input
            label="Website"
            value={form.website}
            onChange={(e) => updateField("website", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, website: true }))}
            placeholder="company.in"
            error={errors.website}
            hint="https:// is added automatically if you don't"
          />
          <Select
            label="Financial Year Start"
            options={MONTHS}
            value={form.fiscal_year_start}
            onChange={(v) => updateField("fiscal_year_start", v)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
          {success && (
            <span className="text-sm text-success-700 inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Settings saved
            </span>
          )}
          {saveError && (
            <span className="text-sm text-danger-600">{saveError}</span>
          )}
          <Button
            variant="outline"
            icon={<Undo2 className="h-4 w-4" />}
            onClick={handleDiscard}
            disabled={!isDirty || saving}
          >
            Discard Changes
          </Button>
          <Button
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
