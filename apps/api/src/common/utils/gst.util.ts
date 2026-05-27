/**
 * GST computation utilities for Indian taxation.
 * Handles CGST, SGST, IGST, and Cess calculations.
 */

/** Standard GST rate slabs in India */
export const GST_RATE_SLABS = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATE_SLABS)[number];

export interface GstBreakdown {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalTax: number;
  totalWithTax: number;
}

export interface GstComputeInput {
  amount: number;
  gstRate: number;
  cessRate?: number;
  isInterState: boolean;
  isInclusive?: boolean;
}

/**
 * Compute full GST breakdown for a given amount.
 *
 * @param input.amount - The taxable amount (or inclusive amount if isInclusive=true)
 * @param input.gstRate - GST rate percentage (e.g., 18)
 * @param input.cessRate - Optional cess percentage
 * @param input.isInterState - true for IGST (inter-state), false for CGST+SGST (intra-state)
 * @param input.isInclusive - If true, the amount already includes GST
 */
export function computeGst(input: GstComputeInput): GstBreakdown {
  const { gstRate, cessRate = 0, isInterState, isInclusive = false } = input;
  let { amount } = input;

  let taxableAmount: number;

  if (isInclusive) {
    // Reverse-calculate taxable amount from inclusive price
    const totalTaxRate = gstRate + cessRate;
    taxableAmount = roundCurrency(amount / (1 + totalTaxRate / 100));
  } else {
    taxableAmount = roundCurrency(amount);
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;
  let cessAmount = 0;

  if (isInterState) {
    // IGST applies for inter-state supply
    igstRate = gstRate;
    igstAmount = roundCurrency(taxableAmount * igstRate / 100);
  } else {
    // CGST + SGST (equal split) for intra-state supply
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    cgstAmount = roundCurrency(taxableAmount * cgstRate / 100);
    sgstAmount = roundCurrency(taxableAmount * sgstRate / 100);
  }

  if (cessRate > 0) {
    cessAmount = roundCurrency(taxableAmount * cessRate / 100);
  }

  const totalTax = roundCurrency(cgstAmount + sgstAmount + igstAmount + cessAmount);
  const totalWithTax = roundCurrency(taxableAmount + totalTax);

  return {
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessRate,
    cessAmount,
    totalTax,
    totalWithTax,
  };
}

/**
 * Determine if a supply is inter-state based on place of supply vs. seller state.
 */
export function isInterStateSupply(sellerStateCode: string, placeOfSupply: string): boolean {
  return sellerStateCode !== placeOfSupply;
}

/**
 * Compute GST for an invoice line item.
 */
export function computeLineItemGst(
  quantity: number,
  rate: number,
  discountPct: number,
  gstRate: number,
  cessRate: number,
  isInterState: boolean,
): GstBreakdown & { subtotal: number; discountAmount: number } {
  const subtotal = roundCurrency(quantity * rate);
  const discountAmount = roundCurrency(subtotal * discountPct / 100);
  const taxableAmount = roundCurrency(subtotal - discountAmount);

  const gst = computeGst({
    amount: taxableAmount,
    gstRate,
    cessRate,
    isInterState,
  });

  return {
    subtotal,
    discountAmount,
    ...gst,
  };
}

/**
 * Aggregate GST for an entire invoice (sum of all line items by rate).
 */
export function aggregateInvoiceGst(
  lineItems: GstBreakdown[],
): {
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  grandTotal: number;
  taxByRate: Record<string, { taxableAmount: number; tax: number }>;
} {
  let totalTaxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;
  const taxByRate: Record<string, { taxableAmount: number; tax: number }> = {};

  for (const item of lineItems) {
    totalTaxableAmount += item.taxableAmount;
    totalCgst += item.cgstAmount;
    totalSgst += item.sgstAmount;
    totalIgst += item.igstAmount;
    totalCess += item.cessAmount;

    const rateKey = String(item.igstRate || (item.cgstRate + item.sgstRate));
    if (!taxByRate[rateKey]) {
      taxByRate[rateKey] = { taxableAmount: 0, tax: 0 };
    }
    taxByRate[rateKey].taxableAmount += item.taxableAmount;
    taxByRate[rateKey].tax += item.totalTax;
  }

  const totalTax = roundCurrency(totalCgst + totalSgst + totalIgst + totalCess);
  const grandTotal = roundCurrency(totalTaxableAmount + totalTax);

  return {
    totalTaxableAmount: roundCurrency(totalTaxableAmount),
    totalCgst: roundCurrency(totalCgst),
    totalSgst: roundCurrency(totalSgst),
    totalIgst: roundCurrency(totalIgst),
    totalCess: roundCurrency(totalCess),
    totalTax,
    grandTotal,
    taxByRate,
  };
}

/**
 * GST state code → human-readable name. Used to look up the place-of-supply
 * state from the first two characters of a GSTIN. Kept here (not the
 * frontend) so backend validation messages and any future MCA/GSTN export
 * speak the same language.
 */
export const GSTIN_STATE_NAMES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana',
  '37': 'Andhra Pradesh', '38': 'Ladakh',
  '97': 'Other Territory', '99': 'Centre Jurisdiction',
};

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Validate a GSTIN (GST Identification Number).
 * Format: 2-digit state code + 10-digit PAN + 1 entity code + 1 Z + 1 checksum
 */
export function validateGstin(gstin: string): {
  valid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  entityCode?: string;
  checksum?: string;
  error?: string;
} {
  if (!gstin || gstin.length !== 15) {
    return { valid: false, error: 'GSTIN must be 15 characters' };
  }

  const cleaned = gstin.trim().toUpperCase();
  if (!GSTIN_REGEX.test(cleaned)) {
    return { valid: false, error: 'Invalid GSTIN format' };
  }

  const stateCode = cleaned.substring(0, 2);
  const pan = cleaned.substring(2, 12);

  const stateName = GSTIN_STATE_NAMES[stateCode];
  if (!stateName) {
    return { valid: false, error: `Unknown state code ${stateCode} in GSTIN` };
  }

  return {
    valid: true,
    stateCode,
    stateName,
    pan,
    entityCode: cleaned.substring(12, 13),
    checksum: cleaned.substring(14, 15),
  };
}

/**
 * Pull the embedded PAN (chars 3-12) from a GSTIN. Returns null on
 * invalid input. Used by service layers to auto-fill PAN when only
 * GSTIN was provided, or to validate that a user-entered PAN matches.
 */
export function extractPanFromGstin(gstin: string): string | null {
  const parsed = validateGstin(gstin);
  return parsed.valid ? parsed.pan! : null;
}

/** Standalone PAN format check — independent of any GSTIN. */
export function isValidPan(pan: string): boolean {
  if (!pan) return false;
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

/**
 * Verify that a user-entered PAN matches the PAN embedded inside a GSTIN.
 * Returns true when either side is missing — only flags real mismatches
 * (so callers can use this without short-circuiting on optional fields).
 */
export function panMatchesGstin(
  pan: string | null | undefined,
  gstin: string | null | undefined,
): boolean {
  if (!pan || !gstin) return true;
  const embedded = extractPanFromGstin(gstin);
  if (!embedded) return true; // GSTIN is invalid; let the GSTIN validator complain
  return pan.trim().toUpperCase() === embedded;
}

/**
 * Round to 2 decimal places (standard currency rounding).
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}
