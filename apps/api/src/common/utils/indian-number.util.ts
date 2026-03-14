/**
 * Indian number formatting utilities.
 * Handles the Indian numbering system (lakhs, crores) and INR currency formatting.
 */

/**
 * Format a number in the Indian numbering system (lakhs/crores).
 * 123456789 → "12,34,56,789"
 */
export function formatIndianNumber(num: number, decimals = 2): string {
  if (isNaN(num)) return '0';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const [intPart, decPart] = absNum.toFixed(decimals).split('.');

  // Indian grouping: last 3 digits, then groups of 2
  let result = '';
  const digits = intPart;
  const len = digits.length;

  if (len <= 3) {
    result = digits;
  } else {
    // Last 3 digits
    result = digits.slice(len - 3);
    let remaining = digits.slice(0, len - 3);

    // Group remaining in pairs
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
 * Format amount as Indian Rupees.
 * 123456.50 → "₹1,23,456.50"
 */
export function formatINR(amount: number, decimals = 2): string {
  return '₹' + formatIndianNumber(amount, decimals);
}

/**
 * Convert a number to words in the Indian system.
 * Used for invoice totals ("Rupees Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven Only")
 */
export function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero';

  const isNegative = num < 0;
  num = Math.abs(num);

  const intPart = Math.floor(num);
  const decimalPart = Math.round((num - intPart) * 100);

  let words = convertIntToWords(intPart);

  if (decimalPart > 0) {
    words += ' and ' + convertIntToWords(decimalPart) + ' Paise';
  }

  if (isNegative) {
    words = 'Minus ' + words;
  }

  return words;
}

function convertIntToWords(n: number): string {
  if (n === 0) return '';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000)
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertIntToWords(n % 100) : '');
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    return convertIntToWords(thousands) + ' Thousand' + (remainder ? ' ' + convertIntToWords(remainder) : '');
  }
  if (n < 10000000) {
    const lakhs = Math.floor(n / 100000);
    const remainder = n % 100000;
    return convertIntToWords(lakhs) + ' Lakh' + (remainder ? ' ' + convertIntToWords(remainder) : '');
  }
  const crores = Math.floor(n / 10000000);
  const remainder = n % 10000000;
  return convertIntToWords(crores) + ' Crore' + (remainder ? ' ' + convertIntToWords(remainder) : '');
}

/**
 * Format amount for invoice total in words.
 * 1234567.50 → "Rupees Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven and Fifty Paise Only"
 */
export function amountInWords(amount: number): string {
  return 'Rupees ' + numberToIndianWords(amount) + ' Only';
}

/**
 * Convert to abbreviated Indian format.
 * 1234567 → "12.35L"
 * 12345678 → "1.23Cr"
 */
export function abbreviateIndian(num: number): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    return sign + (absNum / 10000000).toFixed(2) + 'Cr';
  }
  if (absNum >= 100000) {
    return sign + (absNum / 100000).toFixed(2) + 'L';
  }
  if (absNum >= 1000) {
    return sign + (absNum / 1000).toFixed(2) + 'K';
  }
  return sign + absNum.toFixed(2);
}
