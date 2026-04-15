import { z } from 'zod';

export const CreateDeliveryChallanSchema = z.object({
  contact_id: z.string().uuid(),
  date: z.string(),
  place_of_supply: z.string().optional(),
  delivery_address: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.enum(['draft', 'sent', 'delivered', 'cancelled']).default('draft'),
  items: z.array(
    z.object({
      product_id: z.string().uuid().optional(),
      description: z.string(),
      hsn_code: z.string().optional(),
      quantity: z.number().positive(),
      unit: z.string().optional(),
      rate: z.number().min(0).optional(),
    }),
  ).min(1),
});

export type CreateDeliveryChallanDto = z.infer<typeof CreateDeliveryChallanSchema>;
