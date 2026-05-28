/**
 * Shared GST + date helpers used by Sales Invoice, Purchase Bill,
 * Credit Note, and Debit Note forms.
 *
 * Kept in sync with the backend's apps/api/src/common/utils/gst.util.ts.
 * The forms duplicated these constants for a while; extracting them
 * here so a Finance Act change only edits one file and so all four
 * forms agree on inter-state detection.
 */

// First 2 chars of a GSTIN map to a state code → 2-letter
// abbreviation used by the INDIAN_STATES dropdowns.
export const GSTIN_CODE_TO_STATE_ABBR: Record<string, string> = {
  "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK",
  "06": "HR", "07": "DL", "08": "RJ", "09": "UP", "10": "BR",
  "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ",
  "16": "TR", "17": "ML", "18": "AS", "19": "WB", "20": "JH",
  "21": "OD", "22": "CT", "23": "MP", "24": "GJ", "25": "DN",
  "26": "DN", "27": "MH", "28": "AP", "29": "KA", "30": "GA",
  "31": "LA", "32": "KL", "33": "TN", "34": "PY", "35": "AN",
  "36": "TG", "37": "AP", "38": "LA",
};

export function stateAbbrFromGstin(gstin?: string | null): string {
  if (!gstin) return "";
  const code = gstin.trim().slice(0, 2);
  return GSTIN_CODE_TO_STATE_ABBR[code] || "";
}

/**
 * Add `days` to a YYYY-MM-DD string and return in the same format.
 * Uses local-time Date arithmetic so a +30-day jump lands on the
 * same calendar day everywhere — UTC math here would drift in IST
 * and produce off-by-one due dates near month boundaries.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + (Number.isFinite(days) ? days : 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Resolve the party's (customer or vendor) state for Place-of-Supply
 * purposes. GSTIN-derived state wins; B2C / unregistered contacts
 * fall back to billing_address.state. Returns "" when neither is
 * available — callers should treat that as "user must pick POS
 * manually".
 */
export function partyStateFromContact(contact: {
  gstin?: string | null;
  billing_address?: Record<string, any> | null;
}): string {
  if (!contact) return "";
  const fromGstin = stateAbbrFromGstin(contact.gstin);
  if (fromGstin) return fromGstin;
  const fromBilling = contact.billing_address?.state;
  return typeof fromBilling === "string" ? fromBilling : "";
}

/**
 * Inter-state detection. Both sides must be present; empty supplier
 * state (org GSTIN missing) defaults to intra-state — the safer
 * default that matches the legacy behaviour for orgs that haven't
 * finished Tax Settings yet.
 */
export function isInterStateTransaction(
  partyState: string,
  supplierState: string,
): boolean {
  return !!partyState && !!supplierState && partyState !== supplierState;
}

// ─── TDS ────────────────────────────────────────────────────

/**
 * Read vendor's TDS config from Contact.metadata.tds — populated by
 * the vendor form (Contacts → Vendor → TDS Configuration). Returns
 * null when the vendor doesn't have TDS enabled, otherwise the
 * effective section + rate (with lower-deduction certificate
 * overriding the section's default rate).
 */
export interface VendorTdsConfig {
  enabled: boolean;
  section: string | null;
  rate: number | null;
  threshold: number | null;
  lower_deduction?: {
    certificate_no: string;
    valid_till: string | null;
    rate: number | null;
  } | null;
}

export function readVendorTds(metadata: Record<string, any> | null | undefined): {
  enabled: boolean;
  section: string;
  rate: number;
} | null {
  const cfg = metadata?.tds as VendorTdsConfig | undefined;
  if (!cfg || !cfg.enabled) return null;
  // Lower-deduction certificate (Sec 197) overrides the section's
  // default rate when present and not expired. We don't enforce the
  // expiry here — that check belongs in the bill-create endpoint.
  const lowerRate = cfg.lower_deduction?.rate;
  const effectiveRate =
    typeof lowerRate === "number" && lowerRate > 0 ? lowerRate : cfg.rate;
  if (!effectiveRate || effectiveRate <= 0) return null;
  return {
    enabled: true,
    section: cfg.section || "",
    rate: effectiveRate,
  };
}

/**
 * TDS is deducted on the *taxable* value, NOT on the GST-inclusive
 * total. This is a common mistake — GST is excluded from the TDS
 * base under the 2017 CBDT clarification (Circular 23/2017).
 */
export function computeTdsAmount(taxableValue: number, ratePct: number): number {
  if (!Number.isFinite(taxableValue) || !Number.isFinite(ratePct)) return 0;
  return Math.round(((taxableValue * ratePct) / 100) * 100) / 100;
}
