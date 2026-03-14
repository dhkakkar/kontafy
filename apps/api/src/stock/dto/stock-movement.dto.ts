import { z } from 'zod';

export const createStockMovementSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  warehouse_id: z.string().uuid('Invalid warehouse ID'),
  type: z.enum(['purchase_in', 'sale_out', 'adjustment', 'transfer']),
  quantity: z.number().positive('Quantity must be positive'),
  reference_type: z.string().max(50).optional(),
  reference_id: z.string().uuid().optional(),
  batch_number: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  cost_price: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  // For transfer type: destination warehouse
  destination_warehouse_id: z.string().uuid().optional(),
});

export const listStockMovementsSchema = z.object({
  product_id: z.string().uuid().optional(),
  warehouse_id: z.string().uuid().optional(),
  type: z.enum(['purchase_in', 'sale_out', 'adjustment', 'transfer']).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateStockMovementDto = z.infer<typeof createStockMovementSchema>;
export type ListStockMovementsDto = z.infer<typeof listStockMovementsSchema>;
