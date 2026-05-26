"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Trash2,
  Building2,
  Plus,
  X,
  Power,
  PowerOff,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

const PLANS = ["starter", "pro", "business", "enterprise"];
const FY_MONTHS = [
  { value: 1, label: "January" },
  { value: 4, label: "April" },
  { value: 7, label: "July" },
  { value: 10, label: "October" },
];

const BUSINESS_TYPES = [
  "Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited Company",
  "Public Limited Company",
  "One Person Company",
  "HUF",
  "Trust",
  "Society",
  "Other",
];

const INDUSTRIES = [
  "IT / Digital Services",
  "Manufacturing",
  "Trading",
  "Consulting",
  "Healthcare",
  "Education",
  "Hospitality",
  "Construction",
  "Other",
];

// First two digits of a GSTIN encode the state under the GST place-of-supply
// rules. Used to auto-derive State from the entered GSTIN so the admin can't
// pick mismatched values.
const GSTIN_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// Indian mobile: 10 digits starting with 6/7/8/9
const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common passwords we refuse outright even if they happen to satisfy the
// regex policy — these show up first in every credential-stuffing list.
const WEAK_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty",
  "qwerty123",
  "abc12345",
  "11111111",
  "admin123",
  "welcome1",
  "letmein1",
  "iloveyou",
]);

function panFromGstin(gstin: string): string {
  // Chars 3-12 of a valid GSTIN are the holder's PAN. Slice even if the
  // GSTIN isn't yet complete so PAN trails GSTIN keystroke-by-keystroke.
  return gstin.slice(2, 12).toUpperCase();
}

function stateFromGstin(gstin: string): string {
  if (gstin.length < 2) return "";
  return GSTIN_STATE_CODES[gstin.slice(0, 2)] || "";
}

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string };

function scorePassword(pw: string): Strength {
  if (!pw) return { score: 0, label: "", color: "bg-gray-200" };
  const lower = pw.toLowerCase();
  if (WEAK_PASSWORDS.has(lower)) {
    return { score: 1, label: "Too common", color: "bg-danger-500" };
  }
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score = Math.min(4, score + 1);
  const map: Record<number, Strength> = {
    0: { score: 0, label: "", color: "bg-gray-200" },
    1: { score: 1, label: "Weak", color: "bg-danger-500" },
    2: { score: 2, label: "Fair", color: "bg-amber-500" },
    3: { score: 3, label: "Good", color: "bg-primary-500" },
    4: { score: 4, label: "Strong", color: "bg-success-500" },
  };
  return map[score as 0 | 1 | 2 | 3 | 4];
}

function isPasswordPolicyOk(pw: string): boolean {
  if (pw.length < 8) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  if (WEAK_PASSWORDS.has(pw.toLowerCase())) return false;
  return true;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

interface NewOrgState {
  name: string;
  owner_email: string;
  owner_password: string;
  owner_full_name: string;
  legal_name: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  business_type: string;
  industry: string;
  plan: string;
  fiscal_year_start: number;
}

const EMPTY_ORG: NewOrgState = {
  name: "",
  owner_email: "",
  owner_password: "",
  owner_full_name: "",
  legal_name: "",
  gstin: "",
  pan: "",
  email: "",
  phone: "",
  business_type: "",
  industry: "",
  plan: "starter",
  fiscal_year_start: 4,
};

export default function SuperadminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrg, setNewOrg] = useState<NewOrgState>(EMPTY_ORG);
  const [showPassword, setShowPassword] = useState(false);
  // panEditedByUser stays false while PAN mirrors the GSTIN; once the admin
  // overrides PAN we stop auto-syncing and start surfacing a mismatch warning.
  const [panEditedByUser, setPanEditedByUser] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const derivedState = stateFromGstin(newOrg.gstin);

  const errors: Record<string, string> = {};
  if (touched.name && !newOrg.name.trim()) errors.name = "Organization name is required";
  if (touched.owner_email) {
    if (!newOrg.owner_email.trim()) errors.owner_email = "Owner email is required";
    else if (!EMAIL_REGEX.test(newOrg.owner_email.trim()))
      errors.owner_email = "Enter a valid email";
  }
  if (touched.owner_password) {
    if (!newOrg.owner_password) errors.owner_password = "Password is required";
    else if (!isPasswordPolicyOk(newOrg.owner_password))
      errors.owner_password =
        "Must be 8+ chars with uppercase, lowercase, number, and symbol";
  }
  if (touched.gstin && newOrg.gstin && !GSTIN_REGEX.test(newOrg.gstin))
    errors.gstin = "Invalid GSTIN format (15 chars, e.g. 27AAFCT1234A1Z5)";
  // GSTIN is optional for unregistered orgs, but if provided then PAN is
  // required and must match its embedded PAN (chars 3-12). For GST-less orgs
  // we still ask for PAN to support TDS/return filing later.
  if (touched.pan) {
    if (!newOrg.pan.trim()) errors.pan = "PAN is required";
    else if (!PAN_REGEX.test(newOrg.pan)) errors.pan = "Invalid PAN format";
    else if (
      newOrg.gstin &&
      GSTIN_REGEX.test(newOrg.gstin) &&
      panFromGstin(newOrg.gstin) !== newOrg.pan
    )
      errors.pan = "PAN does not match the PAN embedded in GSTIN";
  }
  if (touched.email && newOrg.email && !EMAIL_REGEX.test(newOrg.email))
    errors.email = "Enter a valid email";
  if (touched.phone && newOrg.phone) {
    const digits = newOrg.phone.replace(/\D/g, "");
    if (!PHONE_REGEX.test(digits))
      errors.phone = "10-digit Indian mobile starting with 6/7/8/9";
  }

  const formValid = useMemo(() => {
    if (!newOrg.name.trim()) return false;
    if (!EMAIL_REGEX.test(newOrg.owner_email.trim())) return false;
    if (!isPasswordPolicyOk(newOrg.owner_password)) return false;
    if (!newOrg.pan.trim() || !PAN_REGEX.test(newOrg.pan)) return false;
    if (newOrg.gstin) {
      if (!GSTIN_REGEX.test(newOrg.gstin)) return false;
      if (panFromGstin(newOrg.gstin) !== newOrg.pan) return false;
    }
    if (newOrg.email && !EMAIL_REGEX.test(newOrg.email)) return false;
    if (newOrg.phone) {
      const digits = newOrg.phone.replace(/\D/g, "");
      if (!PHONE_REGEX.test(digits)) return false;
    }
    return true;
  }, [newOrg]);

  const strength = scorePassword(newOrg.owner_password);

  const resetForm = () => {
    setNewOrg(EMPTY_ORG);
    setTouched({});
    setPanEditedByUser(false);
    setShowPassword(false);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "organizations", page, search],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), limit: "20" };
      if (search) params.search = search;
      return api.get<any>("/superadmin/organizations", params);
    },
  });

  const organizations = data?.data || [];
  const meta = data?.meta || {};

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/organizations/${id}`),
    onSuccess: () => {
      alert("Organization deleted");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    },
    onError: (e: any) => alert(e?.message || "Delete failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active, reason }: { id: string; is_active: boolean; reason?: string }) =>
      api.patch(`/superadmin/organizations/${id}/status`, { is_active, reason }),
    onSuccess: (_d, vars) => {
      alert(vars.is_active ? "Organization activated" : "Organization deactivated");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    },
    onError: (e: any) => alert(e?.message || "Status update failed"),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      // Strip empty optional fields so backend defaults apply cleanly
      const phoneDigits = newOrg.phone.replace(/\D/g, "");
      const payload: Record<string, unknown> = {
        name: newOrg.name.trim(),
        owner_email: newOrg.owner_email.trim(),
        owner_password: newOrg.owner_password,
        plan: newOrg.plan,
        fiscal_year_start: newOrg.fiscal_year_start,
      };
      if (newOrg.owner_full_name.trim()) {
        payload.owner_full_name = newOrg.owner_full_name.trim();
      }
      const optional: Array<[keyof NewOrgState, string]> = [
        ["legal_name", newOrg.legal_name.trim()],
        ["gstin", newOrg.gstin.trim().toUpperCase()],
        ["pan", newOrg.pan.trim().toUpperCase()],
        ["email", newOrg.email.trim()],
        ["business_type", newOrg.business_type],
        ["industry", newOrg.industry],
      ];
      for (const [k, v] of optional) if (v) payload[k] = v;
      // Send the canonical +91-prefixed form to the backend, never the
      // human-readable "98765 43210" string.
      if (phoneDigits.length === 10) payload.phone = `+91${phoneDigits}`;
      return api.post("/superadmin/organizations", payload);
    },
    onSuccess: () => {
      alert(
        `Organization created. Owner can log in with ${newOrg.owner_email} and the password you set.`,
      );
      setShowCreate(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    },
    onError: (e: any) => alert(e?.message || "Create failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">{meta.total || 0} organizations on the platform</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" /> Create Organization
        </Button>
      </div>

      {/* Create org form */}
      {showCreate && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create New Organization</h2>
            <button
              onClick={() => { setShowCreate(false); resetForm(); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Required */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Acme Pvt. Ltd."
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                error={errors.name}
              />
            </div>

            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Owner Account
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Owner Email <span className="text-red-500">*</span>
                    <span
                      className="ml-1 text-gray-400"
                      title="Used as login credential for the owner — separate from the organization's contact email."
                    >
                      ⓘ
                    </span>
                  </label>
                  <Input
                    type="email"
                    placeholder="owner@company.com"
                    value={newOrg.owner_email}
                    onChange={(e) =>
                      setNewOrg({ ...newOrg, owner_email: e.target.value })
                    }
                    onBlur={() => setTouched((t) => ({ ...t, owner_email: true }))}
                    error={errors.owner_email}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Owner Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars: Aa1!"
                    value={newOrg.owner_password}
                    onChange={(e) =>
                      setNewOrg({ ...newOrg, owner_password: e.target.value })
                    }
                    onBlur={() => setTouched((t) => ({ ...t, owner_password: true }))}
                    error={errors.owner_password}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="hover:text-gray-600 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />
                  {newOrg.owner_password && (
                    <div className="mt-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              i <= strength.score ? strength.color : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      {strength.label && (
                        <p
                          className={`text-xs mt-1 ${
                            strength.score <= 1
                              ? "text-danger-600"
                              : strength.score === 2
                                ? "text-amber-600"
                                : "text-success-600"
                          }`}
                        >
                          {strength.label}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Owner Full Name
                  </label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={newOrg.owner_full_name}
                    onChange={(e) =>
                      setNewOrg({ ...newOrg, owner_full_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                If an account with this email already exists, it will be linked as
                the owner and the password field is ignored. Otherwise a new
                account is created with the given password (email auto-verified).
              </p>
            </div>

            {/* Optional details */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Legal Name</label>
              <Input
                placeholder="Registered legal name"
                value={newOrg.legal_name}
                onChange={(e) => setNewOrg({ ...newOrg, legal_name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                GSTIN
                <span
                  className="ml-1 text-gray-400"
                  title="15-character GST number, e.g., 27AAFCT1234A1Z5. Optional for unregistered orgs."
                >
                  ⓘ
                </span>
              </label>
              <Input
                placeholder="27AAFCT1234A1Z5"
                value={newOrg.gstin}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 15);
                  setNewOrg((s) => ({
                    ...s,
                    gstin: v,
                    // While the user hasn't manually overridden PAN, keep it in
                    // lock-step with GSTIN's embedded PAN. As soon as they
                    // touch PAN themselves we stop auto-syncing.
                    pan: panEditedByUser ? s.pan : panFromGstin(v),
                  }));
                }}
                onBlur={() => setTouched((t) => ({ ...t, gstin: true }))}
                maxLength={15}
                error={errors.gstin}
                hint={
                  !errors.gstin && newOrg.gstin && GSTIN_REGEX.test(newOrg.gstin) && derivedState
                    ? `State: ${derivedState}`
                    : undefined
                }
                rightIcon={
                  newOrg.gstin && GSTIN_REGEX.test(newOrg.gstin) ? (
                    <Check className="h-4 w-4 text-success-600" />
                  ) : undefined
                }
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                PAN <span className="text-red-500">*</span>
                <span
                  className="ml-1 text-gray-400"
                  title="10-character PAN. Auto-filled from GSTIN; can be edited if GSTIN is not registered."
                >
                  ⓘ
                </span>
              </label>
              <Input
                placeholder="AAFCT1234A"
                value={newOrg.pan}
                onChange={(e) => {
                  setPanEditedByUser(true);
                  setNewOrg({
                    ...newOrg,
                    pan: e.target.value.toUpperCase().slice(0, 10),
                  });
                }}
                onBlur={() => setTouched((t) => ({ ...t, pan: true }))}
                maxLength={10}
                error={errors.pan}
                rightIcon={
                  newOrg.pan && PAN_REGEX.test(newOrg.pan) ? (
                    <Check className="h-4 w-4 text-success-600" />
                  ) : undefined
                }
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Organization Email
                <span
                  className="ml-1 text-gray-400"
                  title="Appears on invoices & official communication — separate from the owner's login email."
                >
                  ⓘ
                </span>
              </label>
              <Input
                type="email"
                placeholder="contact@company.com"
                value={newOrg.email}
                onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                error={errors.email}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Phone</label>
              <Input
                placeholder="98765 43210"
                leftIcon={<span className="text-gray-500 text-sm">+91</span>}
                value={newOrg.phone}
                onChange={(e) => setNewOrg({ ...newOrg, phone: formatPhone(e.target.value) })}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                error={errors.phone}
                maxLength={11}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Business Type</label>
              <select
                value={newOrg.business_type}
                onChange={(e) => setNewOrg({ ...newOrg, business_type: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
              >
                <option value="">Select…</option>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Industry</label>
              <select
                value={newOrg.industry}
                onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
              >
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Fiscal Year Start
                <span
                  className="ml-1 text-gray-400"
                  title="India default is April. Choose January if your company follows the calendar year."
                >
                  ⓘ
                </span>
              </label>
              <select
                value={newOrg.fiscal_year_start}
                onChange={(e) => setNewOrg({ ...newOrg, fiscal_year_start: parseInt(e.target.value) })}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
              >
                {FY_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Subscription is kept separate from organization profile so the
                billing concern stays visually distinct. */}
            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Subscription
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Plan</label>
                  <select
                    value={newOrg.plan}
                    onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Set the initial plan for this organization. Owner can upgrade
                later from billing settings.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => { setShowCreate(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                // Mark every required field as touched so any remaining
                // errors render immediately when the user clicks submit.
                setTouched({
                  name: true,
                  owner_email: true,
                  owner_password: true,
                  pan: true,
                  gstin: true,
                  email: true,
                  phone: true,
                });
                if (formValid) createMutation.mutate();
              }}
              loading={createMutation.isPending}
              disabled={!formValid}
            >
              <Plus className="h-4 w-4 mr-1" /> Create Organization
            </Button>
          </div>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, or GSTIN..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">Organization</th>
                <th className="text-left p-3 font-medium text-gray-600">Plan</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Members</th>
                <th className="text-left p-3 font-medium text-gray-600">Invoices</th>
                <th className="text-left p-3 font-medium text-gray-600">Contacts</th>
                <th className="text-left p-3 font-medium text-gray-600">Created</th>
                <th className="text-right p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org: any) => {
                const isActive = org.is_active !== false; // default true if missing
                return (
                <tr key={org.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{org.name}</p>
                        {org.email && <p className="text-xs text-gray-500">{org.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><Badge variant="outline">{org.plan}</Badge></td>
                  <td className="p-3">
                    {isActive ? (
                      <Badge variant="success" dot>Active</Badge>
                    ) : (
                      <Badge variant="danger" dot>Inactive</Badge>
                    )}
                  </td>
                  <td className="p-3">{org._count?.members || 0}</td>
                  <td className="p-3">{org._count?.invoices || 0}</td>
                  <td className="p-3">{org._count?.contacts || 0}</td>
                  <td className="p-3 text-gray-500">{new Date(org.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={isActive ? "Deactivate" : "Activate"}
                        onClick={() => {
                          if (isActive) {
                            const reason = prompt(`Deactivate "${org.name}"?\nMembers will lose access until reactivated.\n\nOptional reason:`);
                            if (reason === null) return;
                            statusMutation.mutate({ id: org.id, is_active: false, reason: reason || undefined });
                          } else {
                            if (confirm(`Reactivate "${org.name}"? Members will regain access.`)) {
                              statusMutation.mutate({ id: org.id, is_active: true });
                            }
                          }
                        }}
                      >
                        {isActive ? (
                          <PowerOff className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Power className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (confirm(`Delete "${org.name}"? This cannot be undone.`)) deleteMutation.mutate(org.id);
                      }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {organizations.length === 0 && !isLoading && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">No organizations found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t">
            <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
