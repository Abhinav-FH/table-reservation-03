import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { serializeBigInt } from '../../utils/serialize';
import type { CreateRestaurantInput, UpdateRestaurantInput } from './restaurant.schema';

// ── Public (Customer-facing) ────────────────────────────────────────────────

export async function listRestaurants() {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      grid_rows: true,
      grid_cols: true,
      created_at: true,
      _count: { select: { tables: { where: { is_active: true } } } },
    },
    orderBy: { name: 'asc' },
  });
  return serializeBigInt(restaurants);
}

export async function getRestaurantById(id: bigint) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      grid_rows: true,
      grid_cols: true,
      created_at: true,
      tables: {
        where: { is_active: true },
        select: { id: true, label: true, capacity: true, grid_row: true, grid_col: true },
        orderBy: { label: 'asc' },
      },
    },
  });
  if (!restaurant) throw new AppError(404, 'Restaurant not found');
  return serializeBigInt(restaurant);
}

// ── Admin Restaurant CRUD ───────────────────────────────────────────────────

export async function getAdminRestaurant(adminId: bigint) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { admin_id: adminId },
    include: {
      tables: {
        orderBy: [{ grid_row: 'asc' }, { grid_col: 'asc' }],
      },
    },
  });
  if (!restaurant) throw new AppError(404, 'You have not created a restaurant yet');
  return serializeBigInt(restaurant);
}

export async function createAdminRestaurant(adminId: bigint, input: CreateRestaurantInput) {
  const existing = await prisma.restaurant.findUnique({ where: { admin_id: adminId } });
  if (existing) throw new AppError(409, 'You already have a restaurant. Only one restaurant per admin is allowed.');

  const restaurant = await prisma.restaurant.create({
    data: { ...input, admin_id: adminId },
  });
  return serializeBigInt(restaurant);
}

export async function updateAdminRestaurant(adminId: bigint, input: UpdateRestaurantInput) {
  const restaurant = await prisma.restaurant.findUnique({ where: { admin_id: adminId } });
  if (!restaurant) throw new AppError(404, 'Restaurant not found');

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: input,
  });
  return serializeBigInt(updated);
}
