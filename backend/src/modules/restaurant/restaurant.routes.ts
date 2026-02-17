import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeAdmin } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createRestaurantSchema, updateRestaurantSchema } from './restaurant.schema';
import {
  listRestaurants,
  getRestaurant,
  getAdminRestaurant,
  createAdminRestaurant,
  updateAdminRestaurant,
} from './restaurant.controller';

const router = Router();

// ── Public routes (customer-facing) ────────────────────────────────────────
router.get('/', authenticate, listRestaurants);
router.get('/:id', authenticate, getRestaurant);

// ── Admin routes ────────────────────────────────────────────────────────────
router.get('/admin/mine', authenticate, authorizeAdmin, getAdminRestaurant);
router.post('/admin/mine', authenticate, authorizeAdmin, validate(createRestaurantSchema), createAdminRestaurant);
router.patch('/admin/mine', authenticate, authorizeAdmin, validate(updateRestaurantSchema), updateAdminRestaurant);

export default router;
