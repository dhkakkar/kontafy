import { z } from 'zod';

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required').max(255),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
  is_default: z.boolean().default(false),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export type CreateWarehouseDto = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseDto = z.infer<typeof updateWarehouseSchema>;
