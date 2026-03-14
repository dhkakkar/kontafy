export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  timestamp?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    path: string;
    timestamp: string;
  };
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FiscalYear {
  start: Date;
  end: Date;
  label: string; // e.g., "2025-26"
}

/**
 * Get the fiscal year for a given date (Indian FY: April to March).
 */
export function getFiscalYear(date: Date): FiscalYear {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();

  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    start: new Date(`${startYear}-04-01`),
    end: new Date(`${endYear}-03-31`),
    label: `${startYear}-${String(endYear).slice(2)}`,
  };
}

/**
 * Get the current Indian fiscal quarter for a given date.
 */
export function getFiscalQuarter(date: Date): { quarter: number; label: string; start: Date; end: Date } {
  const month = date.getMonth() + 1;

  if (month >= 4 && month <= 6) {
    const year = date.getFullYear();
    return {
      quarter: 1,
      label: 'Q1 (Apr-Jun)',
      start: new Date(`${year}-04-01`),
      end: new Date(`${year}-06-30`),
    };
  }
  if (month >= 7 && month <= 9) {
    const year = date.getFullYear();
    return {
      quarter: 2,
      label: 'Q2 (Jul-Sep)',
      start: new Date(`${year}-07-01`),
      end: new Date(`${year}-09-30`),
    };
  }
  if (month >= 10 && month <= 12) {
    const year = date.getFullYear();
    return {
      quarter: 3,
      label: 'Q3 (Oct-Dec)',
      start: new Date(`${year}-10-01`),
      end: new Date(`${year}-12-31`),
    };
  }
  // Jan-Mar
  const year = date.getFullYear();
  return {
    quarter: 4,
    label: 'Q4 (Jan-Mar)',
    start: new Date(`${year}-01-01`),
    end: new Date(`${year}-03-31`),
  };
}
