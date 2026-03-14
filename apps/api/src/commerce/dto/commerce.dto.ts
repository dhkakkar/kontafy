import { z } from 'zod';

// ── Platform enum ─────────────────────────────────────────────────────

export const platformEnum = z.enum(['amazon', 'flipkart', 'shopify', 'woocommerce']);
export type Platform = z.infer<typeof platformEnum>;

// ── Connect Platform ──────────────────────────────────────────────────

export const connectPlatformSchema = z.object({
  platform: platformEnum,
  store_name: z.string().min(1, 'Store name is required'),
  credentials: z.record(z.unknown()).refine(
    (val) => Object.keys(val).length > 0,
    'Credentials cannot be empty',
  ),
  settings: z.record(z.unknown()).optional(),
});

export type ConnectPlatformDto = z.infer<typeof connectPlatformSchema>;

// ── Sync Trigger ──────────────────────────────────────────────────────

export const syncTriggerSchema = z.object({
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  type: z.enum(['orders', 'settlements', 'products']).default('orders'),
});

export type SyncTriggerDto = z.infer<typeof syncTriggerSchema>;

// ── Orders List Query ─────────────────────────────────────────────────

export const ordersQuerySchema = z.object({
  platform: platformEnum.optional(),
  status: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type OrdersQueryDto = z.infer<typeof ordersQuerySchema>;

// ── Sync History Query ────────────────────────────────────────────────

export const syncHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SyncHistoryQueryDto = z.infer<typeof syncHistoryQuerySchema>;
