/**
 * Indian number and date formatting utilities.
 * Shared between API and frontend.
 */

/**
 * Format a number in the Indian numbering system.
 * 1234567 → "12,34,567"
 */
export function formatIndianNumber(num: number, decimals = 2): string {
  if (isNaN(num)) return '0';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const [intPart, decPart] = absNum.toFixed(decimals).split('.');

  let result = '';
  const len = intPart.length;

  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(len - 3);
    let remaining = intPart.slice(0, len - 3);
    while (remaining.length > 0) {
      const group = remaining.slice(Math.max(0, remaining.length - 2));
      result = group + ',' + result;
      remaining = remaining.slice(0, Math.max(0, remaining.length - 2));
    }
  }

  if (decPart) {
    result += '.' + decPart;
  }

  return isNegative ? '-' + result : result;
}

/**
 * Format as Indian Rupees.
 * 1234567.50 → "₹12,34,567.50"
 */
export function formatINR(amount: number, decimals = 2): string {
  return '\u20B9' + formatIndianNumber(amount, decimals);
}

/**
 * Abbreviated Indian format.
 * 1234567 → "12.35L", 12345678 → "1.23Cr"
 */
export function abbreviateINR(num: number): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) return sign + '\u20B9' + (absNum / 10000000).toFixed(2) + ' Cr';
  if (absNum >= 100000) return sign + '\u20B9' + (absNum / 100000).toFixed(2) + ' L';
  if (absNum >= 1000) return sign + '\u20B9' + (absNum / 1000).toFixed(2) + ' K';
  return sign + '\u20B9' + absNum.toFixed(2);
}

/**
 * Format date as DD/MM/YYYY (Indian standard).
 */
export function formatDateIN(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date as DD Mon YYYY (e.g., "15 Mar 2026").
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format Indian fiscal year label.
 * Date in April 2025 → "FY 2025-26"
 */
export function formatFiscalYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `FY ${startYear}-${String(endYear).slice(2)}`;
}

/**
 * Format phone number for display.
 * "9876543210" → "+91 98765 43210"
 */
export function formatPhoneIN(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

/**
 * Format GSTIN for display.
 * "06AALCA0517J1Z2" → "06 AALCA0517J 1Z2"
 */
export function formatGstin(gstin: string): string {
  if (gstin.length !== 15) return gstin;
  return `${gstin.slice(0, 2)} ${gstin.slice(2, 12)} ${gstin.slice(12)}`;
}
