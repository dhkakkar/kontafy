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
 * Validate a GSTIN (GST Identification Number).
 * Format: 2-digit state code + 10-digit PAN + 1 entity code + 1 Z + 1 checksum
 */
export function validateGstin(gstin: string): { valid: boolean; stateCode?: string; pan?: string; error?: string } {
  if (!gstin || gstin.length !== 15) {
    return { valid: false, error: 'GSTIN must be 15 characters' };
  }

  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!pattern.test(gstin)) {
    return { valid: false, error: 'Invalid GSTIN format' };
  }

  const stateCode = gstin.substring(0, 2);
  const pan = gstin.substring(2, 12);

  // Validate state code (01-38)
  const stateNum = parseInt(stateCode, 10);
  if (stateNum < 1 || stateNum > 38) {
    return { valid: false, error: 'Invalid state code in GSTIN' };
  }

  return { valid: true, stateCode, pan };
}

/**
 * Round to 2 decimal places (standard currency rounding).
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}
