import { z } from 'zod';

// ─── Common Date Filters ────────────────────────────────────

export const DateRangeSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

// ─── General Ledger ─────────────────────────────────────────

export const GeneralLedgerQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accountId: z.string().uuid().optional(),
  accountType: z.string().optional(),
});

export type GeneralLedgerQuery = z.infer<typeof GeneralLedgerQuerySchema>;

// ─── Day Book ───────────────────────────────────────────────

export const DayBookQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type DayBookQuery = z.infer<typeof DayBookQuerySchema>;

// ─── Aging Reports ──────────────────────────────────────────

export const AgingQuerySchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  contactId: z.string().uuid().optional(),
});

export type AgingQuery = z.infer<typeof AgingQuerySchema>;

export interface AgingBucket {
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total: number;
}

// ─── Sales Register ─────────────────────────────────────────

export const SalesRegisterQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contactId: z.string().uuid().optional(),
  groupBy: z.enum(['customer', 'product', 'month']).default('customer'),
});

export type SalesRegisterQuery = z.infer<typeof SalesRegisterQuerySchema>;

// ─── Purchase Register ──────────────────────────────────────

export const PurchaseRegisterQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contactId: z.string().uuid().optional(),
  groupBy: z.enum(['vendor', 'product', 'month']).default('vendor'),
});

export type PurchaseRegisterQuery = z.infer<typeof PurchaseRegisterQuerySchema>;

// ─── Stock Summary ──────────────────────────────────────────

export const StockSummaryQuerySchema = z.object({
  warehouseId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  belowReorder: z.coerce.boolean().optional(),
});

export type StockSummaryQuery = z.infer<typeof StockSummaryQuerySchema>;

// ─── Stock Movement ─────────────────────────────────────────

export const StockMovementQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  productId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  type: z.string().optional(),
});

export type StockMovementQuery = z.infer<typeof StockMovementQuerySchema>;

// ─── GST Summary ────────────────────────────────────────────

export const GstSummaryQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type GstSummaryQuery = z.infer<typeof GstSummaryQuerySchema>;

// ─── TDS Summary ────────────────────────────────────────────

export const TdsSummaryQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  section: z.string().optional(),
});

export type TdsSummaryQuery = z.infer<typeof TdsSummaryQuerySchema>;

// ─── Export ─────────────────────────────────────────────────

export const ExportReportSchema = z.object({
  reportType: z.enum([
    'general-ledger',
    'day-book',
    'receivable-aging',
    'payable-aging',
    'sales-register',
    'purchase-register',
    'stock-summary',
    'stock-movement',
    'gst-summary',
    'tds-summary',
  ]),
  format: z.enum(['pdf', 'excel', 'csv']),
  filters: z.record(z.string()).optional(),
});

export type ExportReportDto = z.infer<typeof ExportReportSchema>;
