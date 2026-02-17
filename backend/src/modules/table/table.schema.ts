import { z } from 'zod';

const VALID_CAPACITIES = [2, 4, 6] as const;

export const createTableSchema = z.object({
  label: z.string().min(1).max(50),
  capacity: z.number().refine((v) => (VALID_CAPACITIES as readonly number[]).includes(v), {
    message: 'Capacity must be 2, 4, or 6',
  }),
  grid_row: z.number().int().min(0),
  grid_col: z.number().int().min(0),
});

export const updateTableSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  capacity: z
    .number()
    .refine((v) => (VALID_CAPACITIES as readonly number[]).includes(v), {
      message: 'Capacity must be 2, 4, or 6',
    })
    .optional(),
  is_active: z.boolean().optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
