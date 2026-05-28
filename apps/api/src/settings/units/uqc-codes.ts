// GST UQC (Unit Quantity Code) list — exactly the 45 codes the GST
// portal recognises in the GSTR-1 HSN summary JSON. Every Unit of
// Measurement on a product must map to one of these or the GSTR-1
// upload is rejected. Service / time / digital units don't have a
// dedicated UQC — they fall back to OTH-OTHERS, which is the
// portal-accepted convention for "doesn't fit a goods bucket".
//
// Sourced from the GSTN HSN/SAC reference doc. Keep in sync with
// the dropdown in the frontend (apps/web/src/lib/uqc-codes.ts).
export const GST_UQC_CODES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'BAG-BAGS', label: 'BAG - Bags' },
  { code: 'BAL-BALE', label: 'BAL - Bale' },
  { code: 'BDL-BUNDLES', label: 'BDL - Bundles' },
  { code: 'BKL-BUCKLES', label: 'BKL - Buckles' },
  { code: 'BOU-BILLION OF UNITS', label: 'BOU - Billion of Units' },
  { code: 'BOX-BOX', label: 'BOX - Box' },
  { code: 'BTL-BOTTLES', label: 'BTL - Bottles' },
  { code: 'BUN-BUNCHES', label: 'BUN - Bunches' },
  { code: 'CAN-CANS', label: 'CAN - Cans' },
  { code: 'CBM-CUBIC METERS', label: 'CBM - Cubic Meters' },
  { code: 'CCM-CUBIC CENTIMETERS', label: 'CCM - Cubic Centimeters' },
  { code: 'CMS-CENTIMETERS', label: 'CMS - Centimeters' },
  { code: 'CTN-CARTONS', label: 'CTN - Cartons' },
  { code: 'DOZ-DOZENS', label: 'DOZ - Dozens' },
  { code: 'DRM-DRUMS', label: 'DRM - Drums' },
  { code: 'GGK-GREAT GROSS', label: 'GGK - Great Gross' },
  { code: 'GMS-GRAMS', label: 'GMS - Grams' },
  { code: 'GRS-GROSS', label: 'GRS - Gross' },
  { code: 'GYD-GROSS YARDS', label: 'GYD - Gross Yards' },
  { code: 'KGS-KILOGRAMS', label: 'KGS - Kilograms' },
  { code: 'KLR-KILOLITRE', label: 'KLR - Kilolitre' },
  { code: 'KME-KILOMETRE', label: 'KME - Kilometre' },
  { code: 'LTR-LITRES', label: 'LTR - Litres' },
  { code: 'MTR-METERS', label: 'MTR - Meters' },
  { code: 'MLT-MILLILITRE', label: 'MLT - Millilitre' },
  { code: 'MTS-METRIC TON', label: 'MTS - Metric Ton' },
  { code: 'NOS-NUMBERS', label: 'NOS - Numbers' },
  { code: 'PAC-PACKS', label: 'PAC - Packs' },
  { code: 'PCS-PIECES', label: 'PCS - Pieces' },
  { code: 'PRS-PAIRS', label: 'PRS - Pairs' },
  { code: 'QTL-QUINTAL', label: 'QTL - Quintal' },
  { code: 'ROL-ROLLS', label: 'ROL - Rolls' },
  { code: 'SET-SETS', label: 'SET - Sets' },
  { code: 'SQF-SQUARE FEET', label: 'SQF - Square Feet' },
  { code: 'SQM-SQUARE METERS', label: 'SQM - Square Meters' },
  { code: 'SQY-SQUARE YARDS', label: 'SQY - Square Yards' },
  { code: 'TBS-TABLETS', label: 'TBS - Tablets' },
  { code: 'TGM-TEN GROSS', label: 'TGM - Ten Gross' },
  { code: 'THD-THOUSANDS', label: 'THD - Thousands' },
  { code: 'TON-TONNES', label: 'TON - Tonnes' },
  { code: 'TUB-TUBES', label: 'TUB - Tubes' },
  { code: 'UGS-US GALLONS', label: 'UGS - US Gallons' },
  { code: 'UNT-UNITS', label: 'UNT - Units' },
  { code: 'YDS-YARDS', label: 'YDS - Yards' },
  { code: 'OTH-OTHERS', label: 'OTH - Others (use for services)' },
];

const UQC_SET = new Set(GST_UQC_CODES.map((c) => c.code));
export function isValidUqc(code: string): boolean {
  return UQC_SET.has(code);
}

// Seeded on org-create. Covers count, weight, volume, length, service
// and digital categories. Service units map to OTH-OTHERS by GSTN
// convention. `decimals` controls how many fractional digits the
// quantity field accepts — Hours/Days/Months are typically 1-2
// (1.5 hours), whole-unit goods stay at 0.
export const DEFAULT_UNITS: ReadonlyArray<{
  name: string;
  symbol: string;
  uqc_code: string;
  category: 'count' | 'weight' | 'volume' | 'length' | 'service' | 'digital';
  decimals: number;
}> = [
  // ── COUNT / QUANTITY ──────────────────────────────────────
  { name: 'Pieces', symbol: 'PCS', uqc_code: 'PCS-PIECES', category: 'count', decimals: 0 },
  { name: 'Numbers', symbol: 'NOS', uqc_code: 'NOS-NUMBERS', category: 'count', decimals: 0 },
  { name: 'Dozen', symbol: 'DOZ', uqc_code: 'DOZ-DOZENS', category: 'count', decimals: 0 },
  { name: 'Pair', symbol: 'PRS', uqc_code: 'PRS-PAIRS', category: 'count', decimals: 0 },
  { name: 'Set', symbol: 'SET', uqc_code: 'SET-SETS', category: 'count', decimals: 0 },
  { name: 'Box', symbol: 'BOX', uqc_code: 'BOX-BOX', category: 'count', decimals: 0 },
  { name: 'Pack', symbol: 'PAC', uqc_code: 'PAC-PACKS', category: 'count', decimals: 0 },
  { name: 'Unit', symbol: 'UNT', uqc_code: 'UNT-UNITS', category: 'count', decimals: 0 },

  // ── WEIGHT ────────────────────────────────────────────────
  { name: 'Kilogram', symbol: 'KG', uqc_code: 'KGS-KILOGRAMS', category: 'weight', decimals: 3 },
  { name: 'Gram', symbol: 'GM', uqc_code: 'GMS-GRAMS', category: 'weight', decimals: 2 },
  { name: 'Quintal', symbol: 'QTL', uqc_code: 'QTL-QUINTAL', category: 'weight', decimals: 2 },
  { name: 'Tonne', symbol: 'TON', uqc_code: 'TON-TONNES', category: 'weight', decimals: 3 },

  // ── VOLUME ────────────────────────────────────────────────
  { name: 'Litre', symbol: 'LTR', uqc_code: 'LTR-LITRES', category: 'volume', decimals: 3 },
  { name: 'Millilitre', symbol: 'ML', uqc_code: 'MLT-MILLILITRE', category: 'volume', decimals: 2 },
  { name: 'Kilolitre', symbol: 'KL', uqc_code: 'KLR-KILOLITRE', category: 'volume', decimals: 3 },

  // ── LENGTH / AREA ─────────────────────────────────────────
  { name: 'Meter', symbol: 'MTR', uqc_code: 'MTR-METERS', category: 'length', decimals: 2 },
  { name: 'Centimetre', symbol: 'CM', uqc_code: 'CMS-CENTIMETERS', category: 'length', decimals: 1 },
  { name: 'Square Meter', symbol: 'SQM', uqc_code: 'SQM-SQUARE METERS', category: 'length', decimals: 2 },
  { name: 'Square Feet', symbol: 'SQF', uqc_code: 'SQF-SQUARE FEET', category: 'length', decimals: 2 },

  // ── SERVICE / TIME ────────────────────────────────────────
  { name: 'Hour', symbol: 'HR', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 2 },
  { name: 'Day', symbol: 'DAY', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 1 },
  { name: 'Week', symbol: 'WK', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 1 },
  { name: 'Month', symbol: 'MON', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 1 },
  { name: 'Year', symbol: 'YR', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 1 },
  { name: 'Project', symbol: 'PRJ', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 0 },
  { name: 'Job', symbol: 'JOB', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 0 },
  { name: 'Session', symbol: 'SES', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 0 },
  { name: 'Lump Sum', symbol: 'LS', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 0 },
  { name: 'Per Page', symbol: 'PG', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 0 },
  { name: 'Per Word', symbol: 'WRD', uqc_code: 'OTH-OTHERS', category: 'service', decimals: 0 },

  // ── DIGITAL / IT ──────────────────────────────────────────
  { name: 'License', symbol: 'LIC', uqc_code: 'OTH-OTHERS', category: 'digital', decimals: 0 },
  { name: 'User / Seat', symbol: 'USR', uqc_code: 'OTH-OTHERS', category: 'digital', decimals: 0 },
  { name: 'GB', symbol: 'GB', uqc_code: 'OTH-OTHERS', category: 'digital', decimals: 2 },
];
