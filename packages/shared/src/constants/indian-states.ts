/**
 * All Indian states and union territories with their GST state codes.
 */

export interface IndianState {
  code: string;       // 2-digit GST state code
  name: string;       // Full state name
  abbreviation: string; // Common abbreviation
  type: 'state' | 'ut'; // State or Union Territory
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu & Kashmir', abbreviation: 'JK', type: 'ut' },
  { code: '02', name: 'Himachal Pradesh', abbreviation: 'HP', type: 'state' },
  { code: '03', name: 'Punjab', abbreviation: 'PB', type: 'state' },
  { code: '04', name: 'Chandigarh', abbreviation: 'CH', type: 'ut' },
  { code: '05', name: 'Uttarakhand', abbreviation: 'UK', type: 'state' },
  { code: '06', name: 'Haryana', abbreviation: 'HR', type: 'state' },
  { code: '07', name: 'Delhi', abbreviation: 'DL', type: 'ut' },
  { code: '08', name: 'Rajasthan', abbreviation: 'RJ', type: 'state' },
  { code: '09', name: 'Uttar Pradesh', abbreviation: 'UP', type: 'state' },
  { code: '10', name: 'Bihar', abbreviation: 'BR', type: 'state' },
  { code: '11', name: 'Sikkim', abbreviation: 'SK', type: 'state' },
  { code: '12', name: 'Arunachal Pradesh', abbreviation: 'AR', type: 'state' },
  { code: '13', name: 'Nagaland', abbreviation: 'NL', type: 'state' },
  { code: '14', name: 'Manipur', abbreviation: 'MN', type: 'state' },
  { code: '15', name: 'Mizoram', abbreviation: 'MZ', type: 'state' },
  { code: '16', name: 'Tripura', abbreviation: 'TR', type: 'state' },
  { code: '17', name: 'Meghalaya', abbreviation: 'ML', type: 'state' },
  { code: '18', name: 'Assam', abbreviation: 'AS', type: 'state' },
  { code: '19', name: 'West Bengal', abbreviation: 'WB', type: 'state' },
  { code: '20', name: 'Jharkhand', abbreviation: 'JH', type: 'state' },
  { code: '21', name: 'Odisha', abbreviation: 'OD', type: 'state' },
  { code: '22', name: 'Chhattisgarh', abbreviation: 'CG', type: 'state' },
  { code: '23', name: 'Madhya Pradesh', abbreviation: 'MP', type: 'state' },
  { code: '24', name: 'Gujarat', abbreviation: 'GJ', type: 'state' },
  { code: '25', name: 'Daman & Diu', abbreviation: 'DD', type: 'ut' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', abbreviation: 'DN', type: 'ut' },
  { code: '27', name: 'Maharashtra', abbreviation: 'MH', type: 'state' },
  { code: '29', name: 'Karnataka', abbreviation: 'KA', type: 'state' },
  { code: '30', name: 'Goa', abbreviation: 'GA', type: 'state' },
  { code: '31', name: 'Lakshadweep', abbreviation: 'LD', type: 'ut' },
  { code: '32', name: 'Kerala', abbreviation: 'KL', type: 'state' },
  { code: '33', name: 'Tamil Nadu', abbreviation: 'TN', type: 'state' },
  { code: '34', name: 'Puducherry', abbreviation: 'PY', type: 'ut' },
  { code: '35', name: 'Andaman & Nicobar Islands', abbreviation: 'AN', type: 'ut' },
  { code: '36', name: 'Telangana', abbreviation: 'TG', type: 'state' },
  { code: '37', name: 'Andhra Pradesh', abbreviation: 'AP', type: 'state' },
  { code: '38', name: 'Ladakh', abbreviation: 'LA', type: 'ut' },
];

/**
 * Lookup state by GST code.
 */
export function getStateByCode(code: string): IndianState | undefined {
  return INDIAN_STATES.find((s) => s.code === code);
}

/**
 * Lookup state by abbreviation.
 */
export function getStateByAbbreviation(abbr: string): IndianState | undefined {
  return INDIAN_STATES.find((s) => s.abbreviation === abbr.toUpperCase());
}

/**
 * Get state code from GSTIN (first 2 characters).
 */
export function getStateCodeFromGstin(gstin: string): string {
  return gstin.substring(0, 2);
}

/**
 * States as select options.
 */
export const STATE_OPTIONS = INDIAN_STATES.map((s) => ({
  value: s.code,
  label: `${s.code} - ${s.name}`,
}));
