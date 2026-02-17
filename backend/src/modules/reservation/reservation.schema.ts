import { z } from 'zod';

export const createReservationSchema = z.object({
  restaurant_id: z.string().min(1, 'restaurant_id is required'),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  guest_count: z.number().int().min(1, 'At least 1 guest required').max(12, 'Maximum 12 guests'),
  special_requests: z.string().max(500).optional(),
});

export const updateReservationSchema = z.object({
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM').optional(),
  guest_count: z.number().int().min(1).max(12).optional(),
  special_requests: z.string().max(500).optional(),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  guests: z.coerce.number().int().min(1).max(12),
});

export const listReservationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminUpdateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
export type AdminUpdateStatusInput = z.infer<typeof adminUpdateStatusSchema>;
