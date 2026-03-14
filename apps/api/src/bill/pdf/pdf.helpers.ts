/**
 * Helper utilities for invoice PDF generation.
 * Indian numbering system formatting and number-to-words conversion.
 */

/**
 * Format a number using the Indian comma system.
 * e.g., 1234567.89 => "12,34,567.89"
 */
export function formatIndianNumber(n: number): string {
  if (n == null || isNaN(n)) return '0.00';

  const num = Number(n);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  const isNegative = intPart.startsWith('-');
  const absInt = isNegative ? intPart.slice(1) : intPart;

  if (absInt.length <= 3) {
    return `${isNegative ? '-' : ''}${absInt}.${decPart}`;
  }

  // Last 3 digits
  const lastThree = absInt.slice(-3);
  const remaining = absInt.slice(0, -3);

  // Group remaining digits in pairs from right
  const pairs: string[] = [];
  for (let i = remaining.length; i > 0; i -= 2) {
    const start = Math.max(0, i - 2);
    pairs.unshift(remaining.slice(start, i));
  }

  const formatted = pairs.join(',') + ',' + lastThree;
  return `${isNegative ? '-' : ''}${formatted}.${decPart}`;
}

/**
 * Convert a number to words using the Indian numbering system.
 * Supports up to 99,99,99,99,999 (99 arab).
 *
 * @example numberToIndianWords(123456.78) => "One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paise"
 */
export function numberToIndianWords(n: number): string {
  if (n == null || isNaN(n)) return 'Zero';

  const num = Math.abs(Number(n));
  const fixed = num.toFixed(2);
  const [intStr, decStr] = fixed.split('.');

  const intPart = parseInt(intStr, 10);
  const decPart = parseInt(decStr, 10);

  if (intPart === 0 && decPart === 0) return 'Zero';

  let result = '';

  if (intPart > 0) {
    result = convertIntegerToWords(intPart);
  }

  if (decPart > 0) {
    const paiseWords = convertIntegerToWords(decPart);
    if (result) {
      result += ` and ${paiseWords} Paise`;
    } else {
      result = `${paiseWords} Paise`;
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertIntegerToWords(n: number): string {
  if (n === 0) return '';
  if (n < 0) return 'Minus ' + convertIntegerToWords(-n);

  const parts: string[] = [];

  // Crores (1,00,00,000+)
  if (n >= 10000000) {
    const crores = Math.floor(n / 10000000);
    parts.push(convertIntegerToWords(crores) + ' Crore');
    n %= 10000000;
  }

  // Lakhs (1,00,000 - 99,99,999)
  if (n >= 100000) {
    const lakhs = Math.floor(n / 100000);
    parts.push(convertIntegerToWords(lakhs) + ' Lakh');
    n %= 100000;
  }

  // Thousands (1,000 - 99,999)
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    parts.push(convertIntegerToWords(thousands) + ' Thousand');
    n %= 1000;
  }

  // Hundreds (100 - 999)
  if (n >= 100) {
    const hundreds = Math.floor(n / 100);
    parts.push(ones[hundreds] + ' Hundred');
    n %= 100;
  }

  // Tens and ones (1 - 99)
  if (n > 0) {
    if (n < 20) {
      parts.push(ones[n]);
    } else {
      const t = Math.floor(n / 10);
      const o = n % 10;
      parts.push(tens[t] + (o > 0 ? ' ' + ones[o] : ''));
    }
  }

  return parts.join(' ');
}
