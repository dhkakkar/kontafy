"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

// First two characters of a GSTIN identify the place-of-supply state.
// Kept in sync with backend gst.util.ts GSTIN_STATE_NAMES — if you add
// codes there, mirror them here.
const GSTIN_STATE_NAMES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
  "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh",
  "97": "Other Territory", "99": "Centre Jurisdiction",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function extractPanFromGstinUI(gstin: string): string {
  return (gstin || "").trim().toUpperCase().slice(2, 12);
}

export function stateNameFromGstin(gstin: string): string {
  const code = (gstin || "").trim().slice(0, 2);
  return GSTIN_STATE_NAMES[code] || "";
}

interface Props {
  gstin: string;
  pan: string;
  onGstinChange: (gstin: string) => void;
  onPanChange: (pan: string) => void;
  // Optional helper to also surface the derived state name to the caller.
  // Most callers don't store state separately — set this only when you
  // actually want to write it back (e.g. Org Profile, Tax page).
  onDerivedStateChange?: (stateName: string) => void;
  gstinLabel?: string;
  panLabel?: string;
  required?: boolean;
  disabled?: boolean;
  // When true, layout the two fields in a 2-col grid; otherwise stack
  // vertically. Use false inside narrow modals.
  inline?: boolean;
  // Optional right-side button (e.g. "Get Details" GSTN lookup). Caller
  // wires the actual API call.
  gstinRightSlot?: React.ReactNode;
}

/**
 * Paired GSTIN + PAN input. Auto-uppercases on type, derives PAN from
 * GSTIN once 12+ chars are in (chars 3-12), surfaces the state name
 * inline, and flags a mismatch when the user hand-edits PAN to something
 * other than the GSTIN-embedded value.
 *
 * Source of truth on validation rules: apps/api/src/common/utils/gst.util.ts.
 * If a check changes there, mirror it here.
 */
export function GstinPanField({
  gstin,
  pan,
  onGstinChange,
  onPanChange,
  onDerivedStateChange,
  gstinLabel = "GSTIN",
  panLabel = "PAN",
  required = false,
  disabled = false,
  inline = true,
  gstinRightSlot,
}: Props) {
  const gstinClean = (gstin || "").trim().toUpperCase();
  const panClean = (pan || "").trim().toUpperCase();

  const gstinValid = useMemo(
    () => gstinClean.length === 0 || GSTIN_REGEX.test(gstinClean),
    [gstinClean],
  );
  const gstinFullyValid = useMemo(
    () => GSTIN_REGEX.test(gstinClean) && !!GSTIN_STATE_NAMES[gstinClean.slice(0, 2)],
    [gstinClean],
  );

  const embeddedPan = useMemo(
    () => (gstinClean.length >= 12 ? gstinClean.slice(2, 12) : ""),
    [gstinClean],
  );

  // Mismatch only when both sides are present AND we have something to
  // compare against. Don't fire while the user is mid-typing GSTIN.
  const panMismatch =
    !!panClean &&
    !!embeddedPan &&
    GSTIN_REGEX.test(gstinClean) &&
    panClean !== embeddedPan;

  const panFormatError = !!panClean && !PAN_REGEX.test(panClean);
  const stateName = stateNameFromGstin(gstinClean);

  // GSTIN onChange: clean + auto-derive PAN/state. Never overwrite a
  // manually-typed PAN that's longer than the auto-derive snapshot;
  // only fill empty PAN, otherwise let the user keep their version
  // (with the mismatch warning to surface the problem).
  const handleGstinInput = (raw: string) => {
    const next = raw.toUpperCase().replace(/\s/g, "").slice(0, 15);
    onGstinChange(next);
    const newEmbedded = next.length >= 12 ? next.slice(2, 12) : "";
    if (!panClean && newEmbedded) {
      onPanChange(newEmbedded);
    }
    if (onDerivedStateChange) {
      onDerivedStateChange(GSTIN_STATE_NAMES[next.slice(0, 2)] || "");
    }
  };

  const handlePanInput = (raw: string) => {
    onPanChange(raw.toUpperCase().replace(/\s/g, "").slice(0, 10));
  };

  const gstinError = !gstinValid
    ? "Invalid GSTIN format (15 chars, e.g. 27AAFCT1234A1Z5)"
    : undefined;
  const panError = panFormatError
    ? "Invalid PAN format (e.g. AAFCT1234A)"
    : panMismatch
      ? `PAN doesn't match GSTIN (expected ${embeddedPan})`
      : undefined;

  const gstinField = (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label={`${gstinLabel}${required ? " *" : ""}`}
            value={gstin}
            onChange={(e) => handleGstinInput(e.target.value)}
            placeholder="27AAFCT1234A1Z5"
            maxLength={15}
            disabled={disabled}
            error={gstinError}
            hint={
              !gstinError && gstinFullyValid && stateName
                ? `State: ${stateName}`
                : undefined
            }
            rightIcon={
              gstinFullyValid ? (
                <CheckCircle2 className="h-4 w-4 text-success-600" />
              ) : undefined
            }
          />
        </div>
        {gstinRightSlot && <div className="mb-[2px]">{gstinRightSlot}</div>}
      </div>
    </div>
  );

  const panField = (
    <Input
      label={`${panLabel}${required ? " *" : ""}`}
      value={pan}
      onChange={(e) => handlePanInput(e.target.value)}
      placeholder="AAFCT1234A"
      maxLength={10}
      disabled={disabled}
      error={panError}
      hint={
        !panError && panClean && PAN_REGEX.test(panClean)
          ? "Auto-derived from GSTIN"
          : undefined
      }
      rightIcon={
        panClean && PAN_REGEX.test(panClean) && !panMismatch ? (
          <CheckCircle2 className="h-4 w-4 text-success-600" />
        ) : undefined
      }
    />
  );

  if (inline) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gstinField}
        {panField}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {gstinField}
      {panField}
    </div>
  );
}
