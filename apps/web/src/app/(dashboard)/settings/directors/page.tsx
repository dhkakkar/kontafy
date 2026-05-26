"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import {
  Save,
  Loader2,
  UserCog,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Upload,
  FileText,
  ExternalLink,
  X,
} from "lucide-react";

const DIN_REGEX = /^[0-9]{8}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAAR4_REGEX = /^[0-9]{4}$/;

const DESIGNATIONS = [
  { value: "managing_director", label: "Managing Director" },
  { value: "whole_time_director", label: "Whole-Time Director" },
  { value: "executive_director", label: "Executive Director" },
  { value: "non_executive_director", label: "Non-Executive Director" },
  { value: "independent_director", label: "Independent Director" },
  { value: "nominee_director", label: "Nominee Director" },
  { value: "designated_partner", label: "Designated Partner (LLP)" },
  { value: "partner", label: "Partner" },
  { value: "trustee", label: "Trustee" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "resigned", label: "Resigned" },
  { value: "disqualified", label: "Disqualified" },
];

const CHEQUE_AUTHORITY = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
  { value: "with_co_signatory", label: "With Co-Signatory" },
];

const BANK_AUTHORITY = [
  { value: "sole", label: "Sole" },
  { value: "joint", label: "Joint" },
  { value: "either_or_survivor", label: "Either or Survivor" },
];

type DocType = "pan" | "aadhaar" | "din_letter" | "signature" | "photograph";

interface DirectorDocuments {
  pan: string | null;
  aadhaar: string | null;
  din_letter: string | null;
  signature: string | null;
  photograph: string | null;
}

interface Director {
  id: string;
  full_name: string;
  father_or_spouse_name: string;
  din: string;
  pan: string;
  aadhaar_last4: string;
  date_of_birth: string;
  email: string;
  phone: string; // 10 digits without country code
  designation: string;
  appointed_on: string;
  resigned_on: string;
  status: string;
  dir3_kyc_filed_on: string;
  dir3_kyc_due_on: string;
  dsc_valid_until: string;
  can_sign_cheques: string;
  co_signatory_threshold: number;
  can_sign_invoices: boolean;
  bank_authority_type: string;
  permanent_address: string;
  current_address: string;
  documents: DirectorDocuments;
}

const DOC_LABELS: Record<DocType, string> = {
  pan: "PAN Card",
  aadhaar: "Aadhaar Card",
  din_letter: "DIN Allotment Letter",
  signature: "Signature Image",
  photograph: "Photograph",
};

function newDirector(): Director {
  return {
    id: `dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    full_name: "",
    father_or_spouse_name: "",
    din: "",
    pan: "",
    aadhaar_last4: "",
    date_of_birth: "",
    email: "",
    phone: "",
    designation: "other",
    appointed_on: "",
    resigned_on: "",
    status: "active",
    dir3_kyc_filed_on: "",
    dir3_kyc_due_on: "",
    dsc_valid_until: "",
    can_sign_cheques: "no",
    co_signatory_threshold: 0,
    can_sign_invoices: false,
    bank_authority_type: "sole",
    permanent_address: "",
    current_address: "",
    documents: {
      pan: null,
      aadhaar: null,
      din_letter: null,
      signature: null,
      photograph: null,
    },
  };
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export default function DirectorsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showResigned, setShowResigned] = useState(false);
  const [businessType, setBusinessType] = useState<string>("");

  const [directors, setDirectors] = useState<Director[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Keyed by `${directorId}:${docType}` so each upload button shows its own
  // spinner; failures show inline below the button.
  const [uploadingDoc, setUploadingDoc] = useState<Record<string, boolean>>(
    {},
  );
  const [uploadError, setUploadError] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const [dirRes, orgRes] = await Promise.all([
          api.get<{ data: { directors: Director[] } }>("/settings/directors"),
          api.get<{ data: { business_type?: string } }>("/settings/organization"),
        ]);
        const d = ((dirRes as any)?.data || dirRes)?.directors || [];
        setDirectors(
          d.map((r: any) => ({
            ...newDirector(),
            ...r,
            // Strip country-code from any pre-saved phone so display logic
            // can re-prepend "+91" without doubling it up.
            phone: String(r.phone || "").replace(/\D/g, "").slice(-10),
          })),
        );
        const org = (orgRes as any)?.data || orgRes;
        setBusinessType(org?.business_type || "");
      } catch {
        // empty initial state is fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateDir = (id: string, patch: Partial<Director>) => {
    setDirectors((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    setSuccess(false);
    setSaveError("");
  };

  const addDirector = () => {
    const d = newDirector();
    setDirectors((prev) => [...prev, d]);
    setExpandedId(d.id);
  };

  const removeDirector = (id: string) => {
    setDirectors((prev) => prev.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
    setSuccess(false);
  };

  // Uploads a director KYC document straight to R2 via the backend, then
  // sets the returned URL in local director state. The user still has to
  // click Save Changes for the URL to persist on the directors record —
  // that's intentional so cancelling Save discards orphaned uploads.
  const uploadDocument = async (
    director: Director,
    docType: DocType,
    file: File,
  ) => {
    const key = `${director.id}:${docType}`;
    setUploadingDoc((p) => ({ ...p, [key]: true }));
    setUploadError((p) => ({ ...p, [key]: "" }));
    try {
      const allowedMime = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedMime.includes(file.type)) {
        throw new Error("Only PNG, JPEG, WEBP or PDF files are supported.");
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File too large. Max 2MB.");
      }
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("Failed to read file"));
        r.readAsDataURL(file);
      });
      const res = await api.post<{ data?: { url?: string }; url?: string }>(
        "/settings/director-documents",
        { director_id: director.id, doc_type: docType, data_url: dataUrl },
      );
      const url = res?.data?.url || (res as any)?.url;
      if (!url) throw new Error("Upload succeeded but no URL returned");
      updateDir(director.id, {
        documents: { ...director.documents, [docType]: url },
      });
    } catch (err: any) {
      setUploadError((p) => ({ ...p, [key]: err?.message || "Upload failed" }));
    } finally {
      setUploadingDoc((p) => ({ ...p, [key]: false }));
    }
  };

  // Per-row validation — same pattern as the bank-accounts page.
  const errorsByRow = useMemo(() => {
    const errs: Record<string, Record<string, string>> = {};
    const dinSeen = new Map<string, string>(); // din -> first row id
    for (const d of directors) {
      const e: Record<string, string> = {};
      if (!d.full_name.trim()) e.full_name = "Full name is required";
      if (!d.din.trim()) e.din = "DIN is required";
      else if (!DIN_REGEX.test(d.din)) e.din = "DIN must be 8 digits";
      else if (dinSeen.has(d.din)) e.din = "DIN already used by another row";
      else dinSeen.set(d.din, d.id);
      if (!d.pan.trim()) e.pan = "PAN is required";
      else if (!PAN_REGEX.test(d.pan)) e.pan = "Invalid PAN format";
      if (d.aadhaar_last4 && !AADHAAR4_REGEX.test(d.aadhaar_last4))
        e.aadhaar_last4 = "Must be exactly 4 digits";
      if (!d.email.trim()) e.email = "Email is required";
      else if (!EMAIL_REGEX.test(d.email)) e.email = "Invalid email";
      if (!d.phone) e.phone = "Phone is required";
      else if (!PHONE_REGEX.test(d.phone))
        e.phone = "10-digit Indian mobile starting with 6/7/8/9";
      if (!d.appointed_on) e.appointed_on = "Date of appointment is required";
      if (d.resigned_on && d.appointed_on && d.resigned_on < d.appointed_on)
        e.resigned_on = "Cannot be before appointment date";
      if (Object.keys(e).length > 0) errs[d.id] = e;
    }
    return errs;
  }, [directors]);

  const hasErrors = Object.keys(errorsByRow).length > 0;
  const activeCount = directors.filter((d) => d.status === "active").length;

  // Minimum-active warning per MCA rules.
  const minActiveWarning: string | null = useMemo(() => {
    if (businessType === "pvt_ltd" && activeCount < 2)
      return "Private Limited companies must have at least 2 active directors.";
    if (businessType === "public_ltd" && activeCount < 3)
      return "Public Limited companies must have at least 3 active directors.";
    if (businessType === "llp" && activeCount < 2)
      return "LLPs must have at least 2 designated partners.";
    return null;
  }, [businessType, activeCount]);

  const visible = useMemo(
    () =>
      showResigned
        ? directors
        : directors.filter((d) => d.status !== "resigned"),
    [directors, showResigned],
  );

  const heading =
    businessType === "llp" || businessType === "partnership"
      ? "Partners"
      : businessType === "trust"
        ? "Trustees"
        : businessType === "society"
          ? "Office Bearers"
          : "Directors & Signatories";

  const handleSave = async () => {
    if (hasErrors) {
      setSaveError("Please fix the highlighted rows before saving.");
      const firstErr = Object.keys(errorsByRow)[0];
      if (firstErr) setExpandedId(firstErr);
      return;
    }
    setSaving(true);
    setSuccess(false);
    setSaveError("");
    try {
      await api.patch("/settings/directors", {
        directors: directors.map((d) => ({
          ...d,
          // Strip whitespace and normalise phone to digits-only; backend
          // can re-format display in PDFs / cheques as needed.
          full_name: d.full_name.trim(),
          din: d.din.trim(),
          pan: d.pan.trim().toUpperCase(),
          email: d.email.trim(),
          phone: d.phone.replace(/\D/g, "").slice(-10),
        })),
      });
      setSuccess(true);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save directors");
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
    <div className="space-y-6 max-w-4xl">
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-gray-400" />
            {heading}
          </CardTitle>
        </CardHeader>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <p className="text-sm text-gray-500">
            Record signatories with their DIN, PAN, KYC dates and cheque /
            invoice signing authority.
          </p>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showResigned}
              onChange={(e) => setShowResigned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Show resigned
          </label>
        </div>

        {minActiveWarning && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{minActiveWarning}</span>
          </div>
        )}

        {visible.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <UserCog className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {directors.length === 0
                ? "No directors added yet."
                : "All directors are marked resigned. Toggle 'Show resigned' to view."}
            </p>
            {directors.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                icon={<Plus className="h-4 w-4" />}
                onClick={addDirector}
              >
                Add Director
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {visible.map((d) => {
            const expanded = expandedId === d.id;
            const errs = errorsByRow[d.id] || {};
            const rowHasErrors = Object.keys(errs).length > 0;
            return (
              <div
                key={d.id}
                className={`rounded-lg border ${
                  rowHasErrors ? "border-danger-300" : "border-gray-200"
                } overflow-hidden`}
              >
                {/* Collapsed row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {d.full_name || "Untitled director"}
                      </span>
                      {d.status === "active" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-success-700 bg-success-100 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                      {d.status === "resigned" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                          Resigned
                        </span>
                      )}
                      {d.status === "disqualified" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-danger-700 bg-danger-100 px-2 py-0.5 rounded">
                          Disqualified
                        </span>
                      )}
                      {rowHasErrors && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-danger-700 bg-danger-100 px-2 py-0.5 rounded">
                          Incomplete
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {d.designation && `${
                        DESIGNATIONS.find((x) => x.value === d.designation)
                          ?.label || d.designation
                      } · `}
                      {d.din ? `DIN ${d.din}` : "No DIN"}
                      {d.pan ? ` · PAN ${d.pan}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : d.id)}
                    className="text-gray-400 hover:text-gray-700"
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
                        confirm(
                          `Remove "${d.full_name || "Untitled director"}" from this list?`,
                        )
                      )
                        removeDirector(d.id);
                    }}
                    className="text-gray-400 hover:text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {expanded && (
                  <div className="p-4 space-y-6 border-t border-gray-200">
                    {/* Personal */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                        Personal Details
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Full Name *"
                          value={d.full_name}
                          onChange={(e) =>
                            updateDir(d.id, { full_name: e.target.value })
                          }
                          error={errs.full_name}
                        />
                        <Input
                          label="Father's / Spouse's Name"
                          value={d.father_or_spouse_name}
                          onChange={(e) =>
                            updateDir(d.id, {
                              father_or_spouse_name: e.target.value,
                            })
                          }
                        />
                        <Input
                          label="DIN *"
                          value={d.din}
                          onChange={(e) =>
                            updateDir(d.id, {
                              din: e.target.value.replace(/\D/g, "").slice(0, 8),
                            })
                          }
                          placeholder="8 digits"
                          maxLength={8}
                          error={errs.din}
                        />
                        <Input
                          label="PAN *"
                          value={d.pan}
                          onChange={(e) =>
                            updateDir(d.id, {
                              pan: e.target.value.toUpperCase().slice(0, 10),
                            })
                          }
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          error={errs.pan}
                        />
                        <Input
                          label="Aadhaar Last 4 Digits"
                          value={d.aadhaar_last4}
                          onChange={(e) =>
                            updateDir(d.id, {
                              aadhaar_last4: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            })
                          }
                          placeholder="1234"
                          maxLength={4}
                          error={errs.aadhaar_last4}
                          hint="For KYC reference only — never store the full 12 digits"
                        />
                        <Input
                          label="Date of Birth"
                          type="date"
                          value={d.date_of_birth}
                          onChange={(e) =>
                            updateDir(d.id, { date_of_birth: e.target.value })
                          }
                        />
                        <Input
                          label="Email *"
                          type="email"
                          value={d.email}
                          onChange={(e) =>
                            updateDir(d.id, { email: e.target.value })
                          }
                          error={errs.email}
                        />
                        <Input
                          label="Phone *"
                          leftIcon={<span className="text-gray-500 text-sm">+91</span>}
                          value={formatPhoneDisplay(d.phone)}
                          onChange={(e) =>
                            updateDir(d.id, {
                              phone: e.target.value
                                .replace(/\D/g, "")
                                .slice(-10),
                            })
                          }
                          placeholder="98765 43210"
                          maxLength={11}
                          error={errs.phone}
                        />
                      </div>
                    </div>

                    {/* Director Details */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                        Role
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                          label="Designation *"
                          options={DESIGNATIONS}
                          value={d.designation}
                          onChange={(v) => updateDir(d.id, { designation: v })}
                        />
                        <Select
                          label="Status"
                          options={STATUSES}
                          value={d.status}
                          onChange={(v) => updateDir(d.id, { status: v })}
                        />
                        <Input
                          label="Date of Appointment *"
                          type="date"
                          value={d.appointed_on}
                          onChange={(e) =>
                            updateDir(d.id, { appointed_on: e.target.value })
                          }
                          error={errs.appointed_on}
                        />
                        <Input
                          label="Date of Resignation"
                          type="date"
                          value={d.resigned_on}
                          onChange={(e) =>
                            updateDir(d.id, { resigned_on: e.target.value })
                          }
                          error={errs.resigned_on}
                        />
                      </div>
                    </div>

                    {/* Compliance */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                        Compliance
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="DIR-3 KYC Filed Date"
                          type="date"
                          value={d.dir3_kyc_filed_on}
                          onChange={(e) =>
                            updateDir(d.id, {
                              dir3_kyc_filed_on: e.target.value,
                            })
                          }
                        />
                        <Input
                          label="DIR-3 KYC Due Date"
                          type="date"
                          value={d.dir3_kyc_due_on}
                          onChange={(e) =>
                            updateDir(d.id, {
                              dir3_kyc_due_on: e.target.value,
                            })
                          }
                          hint="Defaults to 30 April of the next FY"
                        />
                        <Input
                          label="DSC Valid Until"
                          type="date"
                          value={d.dsc_valid_until}
                          onChange={(e) =>
                            updateDir(d.id, {
                              dsc_valid_until: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Authorities */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                        Signing Authority
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                          label="Authorized to Sign Cheques?"
                          options={CHEQUE_AUTHORITY}
                          value={d.can_sign_cheques}
                          onChange={(v) =>
                            updateDir(d.id, { can_sign_cheques: v })
                          }
                        />
                        <Input
                          label="Co-Signatory Required Above (₹)"
                          type="number"
                          min={0}
                          value={String(d.co_signatory_threshold)}
                          onChange={(e) =>
                            updateDir(d.id, {
                              co_signatory_threshold:
                                Number(e.target.value) || 0,
                            })
                          }
                          leftIcon={
                            <span className="text-gray-500 text-sm">₹</span>
                          }
                          placeholder="50000"
                          disabled={d.can_sign_cheques !== "with_co_signatory"}
                        />
                        <Select
                          label="Bank Authority Type"
                          options={BANK_AUTHORITY}
                          value={d.bank_authority_type}
                          onChange={(v) =>
                            updateDir(d.id, { bank_authority_type: v })
                          }
                        />
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={d.can_sign_invoices}
                            onChange={(e) =>
                              updateDir(d.id, {
                                can_sign_invoices: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          Authorized to sign invoices
                        </label>
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                        Address
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Permanent Address
                          </label>
                          <textarea
                            rows={3}
                            value={d.permanent_address}
                            onChange={(e) =>
                              updateDir(d.id, {
                                permanent_address: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Current Address
                          </label>
                          <textarea
                            rows={3}
                            value={d.current_address}
                            onChange={(e) =>
                              updateDir(d.id, {
                                current_address: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none mt-2">
                            <input
                              type="checkbox"
                              checked={
                                d.current_address === d.permanent_address &&
                                !!d.permanent_address
                              }
                              onChange={(e) =>
                                updateDir(d.id, {
                                  current_address: e.target.checked
                                    ? d.permanent_address
                                    : "",
                                })
                              }
                              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            Same as permanent address
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                        Documents
                      </h5>
                      <p className="text-xs text-gray-500 mb-3">
                        Optional KYC scans. PNG, JPEG, WEBP or PDF up to 2MB.
                        Uploads happen immediately — click Save Changes below
                        to persist the URLs on the director record.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(Object.keys(DOC_LABELS) as DocType[]).map((docType) => {
                          const url = d.documents?.[docType];
                          const uploadKey = `${d.id}:${docType}`;
                          const isUploading = !!uploadingDoc[uploadKey];
                          const err = uploadError[uploadKey];
                          return (
                            <div
                              key={docType}
                              className="border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">
                                  {DOC_LABELS[docType]}
                                </span>
                                {url && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateDir(d.id, {
                                        documents: {
                                          ...d.documents,
                                          [docType]: null,
                                        },
                                      })
                                    }
                                    className="text-gray-400 hover:text-danger-600"
                                    aria-label="Remove document"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-900 break-all"
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">View uploaded file</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ) : (
                                <label className="inline-flex items-center gap-2 text-xs font-medium text-primary-700 hover:text-primary-900 cursor-pointer">
                                  {isUploading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="h-3.5 w-3.5" />
                                  )}
                                  {isUploading ? "Uploading..." : "Upload file"}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadDocument(d, docType, file);
                                      // Reset so the same file can be reselected.
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                              {err && (
                                <p className="mt-1 text-xs text-danger-600">{err}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {directors.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            icon={<Plus className="h-4 w-4" />}
            onClick={addDirector}
          >
            Add {heading.split(" ")[0]}
          </Button>
        )}
      </Card>

      <div className="flex items-center gap-3 justify-end">
        {success && (
          <span className="text-sm text-success-700">Directors saved</span>
        )}
        {saveError && (
          <span className="text-sm text-danger-600">{saveError}</span>
        )}
        <Button
          icon={<Save className="h-4 w-4" />}
          onClick={handleSave}
          loading={saving}
          disabled={hasErrors}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
