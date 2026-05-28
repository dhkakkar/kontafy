import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  type: z.enum(['goods', 'services']).default('goods'),
  // hsn_code holds the GST classification — HSN for goods, SAC for
  // services. The UI flips the label; we keep one column so the
  // GSTR-1 export and tax engine don't have to special-case the type.
  hsn_code: z.string().max(8).optional(),
  // Legacy free-form symbol kept for backward compat with existing
  // products (which were created before UnitOfMeasurement existed).
  // New writes should prefer unit_id; we keep this column populated
  // with the unit's symbol so old reports still render.
  unit: z.string().max(20).default('pcs'),
  unit_id: z.string().uuid().optional(),
  purchase_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  track_inventory: z.boolean().default(true),
  reorder_level: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().url().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
