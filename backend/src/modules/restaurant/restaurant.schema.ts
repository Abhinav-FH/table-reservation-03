import { z } from 'zod';

export const createRestaurantSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(255),
  grid_rows: z.number().int().min(3).max(20),
  grid_cols: z.number().int().min(3).max(20),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().min(5).max(255).optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
