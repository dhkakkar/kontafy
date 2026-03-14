/**
 * GST rate slabs applicable in India.
 */
export const GST_RATE_SLABS = [0, 5, 12, 18, 28] as const;
export type GstRateSlab = (typeof GST_RATE_SLABS)[number];

/**
 * GST rate details including cess information.
 */
export const GST_RATES = [
  { rate: 0, label: 'Exempt / NIL rated', description: 'Essential goods, healthcare, education' },
  { rate: 5, label: '5% GST', description: 'Household necessities, transport, small restaurants' },
  { rate: 12, label: '12% GST', description: 'Processed food, computers, mobiles' },
  { rate: 18, label: '18% GST', description: 'Most goods & services, IT, financial services' },
  { rate: 28, label: '28% GST', description: 'Luxury goods, aerated drinks, automobiles' },
] as const;

/**
 * State codes for Place of Supply in GST.
 */
export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

/**
 * Place of Supply codes (same as state codes for GST).
 */
export const PLACE_OF_SUPPLY = Object.entries(GST_STATE_CODES).map(([code, name]) => ({
  code,
  name,
  label: `${code} - ${name}`,
}));

/**
 * GST return types.
 */
export const GST_RETURN_TYPES = {
  GSTR1: { code: 'GSTR1', name: 'GSTR-1', description: 'Outward supplies', frequency: 'monthly' },
  GSTR2A: { code: 'GSTR2A', name: 'GSTR-2A', description: 'Auto-drafted inward supplies', frequency: 'monthly' },
  GSTR3B: { code: 'GSTR3B', name: 'GSTR-3B', description: 'Summary return', frequency: 'monthly' },
  GSTR9: { code: 'GSTR9', name: 'GSTR-9', description: 'Annual return', frequency: 'annual' },
  GSTR9C: { code: 'GSTR9C', name: 'GSTR-9C', description: 'Reconciliation statement', frequency: 'annual' },
} as const;

/**
 * TDS sections commonly used in business.
 */
export const TDS_SECTIONS = [
  { section: '194C', description: 'Payment to contractor', individual_rate: 1, other_rate: 2, threshold: 30000 },
  { section: '194J', description: 'Professional/technical fees', individual_rate: 10, other_rate: 10, threshold: 30000 },
  { section: '194H', description: 'Commission/brokerage', individual_rate: 5, other_rate: 5, threshold: 15000 },
  { section: '194I(a)', description: 'Rent - Plant/Machinery', individual_rate: 2, other_rate: 2, threshold: 240000 },
  { section: '194I(b)', description: 'Rent - Land/Building', individual_rate: 10, other_rate: 10, threshold: 240000 },
  { section: '194A', description: 'Interest (other than securities)', individual_rate: 10, other_rate: 10, threshold: 40000 },
  { section: '194Q', description: 'Purchase of goods', individual_rate: 0.1, other_rate: 0.1, threshold: 5000000 },
] as const;
