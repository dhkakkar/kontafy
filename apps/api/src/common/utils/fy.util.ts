/**
 * Indian fiscal-year helpers shared by every numbered-document
 * generator (sales invoices, purchase bills, credit notes, debit
 * notes, journals, payments, …).
 *
 * The Indian FY runs April → March. A back-dated document (e.g.
 * 05-Apr-2025 entered in May-2026) must belong to FY 2025-26, NOT
 * to the current system clock's FY. Every caller must pass the
 * *document's* date — `new Date()` here would re-introduce the bug
 * we fixed in commit b34ab06.
 */

/**
 * Returns the FY start/end years for a given date and the org's
 * configured FY-start month (defaults to April = 4).
 *
 * Example: 05-Apr-2025 with fyStartMonth=4 → { start: 2025, end: 2026 }
 * Example: 15-Mar-2026 with fyStartMonth=4 → { start: 2025, end: 2026 }
 * Example: 01-Apr-2026 with fyStartMonth=4 → { start: 2026, end: 2027 }
 */
export function getFinancialYear(
  date: Date,
  fyStartMonth: number = 4,
): { start: number; end: number } {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const start = month >= fyStartMonth ? year : year - 1;
  return { start, end: start + 1 };
}

/**
 * Returns the FY as "2025-26" (long form).
 */
export function formatFyLong(date: Date, fyStartMonth: number = 4): string {
  const { start, end } = getFinancialYear(date, fyStartMonth);
  return `${start}-${String(end).slice(2)}`;
}

/**
 * Returns the FY as "25-26" (short form, used by the BILL/CN/DN fallback formats).
 */
export function formatFyShort(date: Date, fyStartMonth: number = 4): string {
  const { start, end } = getFinancialYear(date, fyStartMonth);
  return `${String(start).slice(2)}-${String(end).slice(2)}`;
}

/**
 * Returns the [start, end] Date pair bounding the FY, useful for
 * Prisma `where: { date: { gte, lte } }` clauses (e.g. counting
 * invoices in the current FY to assign the next sequence number).
 */
export function getFyBounds(
  date: Date,
  fyStartMonth: number = 4,
): { fyStartDate: Date; fyEndDate: Date } {
  const { start, end } = getFinancialYear(date, fyStartMonth);
  return {
    fyStartDate: new Date(start, fyStartMonth - 1, 1),
    fyEndDate: new Date(end, fyStartMonth - 1, 0, 23, 59, 59),
  };
}
