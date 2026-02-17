import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeAdmin, authorizeCustomer } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createReservationSchema,
  updateReservationSchema,
  availabilityQuerySchema,
  listReservationsQuerySchema,
  adminUpdateStatusSchema,
} from './reservation.schema';
import {
  checkAvailability,
  createReservation,
  getMyReservations,
  getReservationById,
  updateReservation,
  cancelReservation,
  adminListReservations,
  adminUpdateStatus,
  adminGetCustomers,
} from './reservation.controller';

const router = Router();

// ── Availability (both customer and admin can check) ────────────────────────
router.get(
  '/restaurants/:restaurantId/availability',
  authenticate,
  validate(availabilityQuerySchema, 'query'),
  checkAvailability
);

// ── Customer reservation CRUD ───────────────────────────────────────────────
router.get('/', authenticate, authorizeCustomer, validate(listReservationsQuerySchema, 'query'), getMyReservations);
router.post('/', authenticate, authorizeCustomer, validate(createReservationSchema), createReservation);
router.get('/:id', authenticate, authorizeCustomer, getReservationById);
router.patch('/:id', authenticate, authorizeCustomer, validate(updateReservationSchema), updateReservation);
router.delete('/:id', authenticate, authorizeCustomer, cancelReservation);

// ── Admin reservation management ────────────────────────────────────────────
router.get('/admin/all', authenticate, authorizeAdmin, validate(listReservationsQuerySchema, 'query'), adminListReservations);
router.patch('/admin/:id/status', authenticate, authorizeAdmin, validate(adminUpdateStatusSchema), adminUpdateStatus);
router.get('/admin/customers', authenticate, authorizeAdmin, adminGetCustomers);

export default router;
