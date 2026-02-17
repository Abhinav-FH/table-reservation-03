import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { serializeBigInt } from '../../utils/serialize';
import type { CreateTableInput, UpdateTableInput } from './table.schema';

// Helper: get restaurant owned by admin, throw if not found
async function getOwnedRestaurant(adminId: bigint) {
  const restaurant = await prisma.restaurant.findUnique({ where: { admin_id: adminId } });
  if (!restaurant) throw new AppError(404, 'Create a restaurant first before adding tables');
  return restaurant;
}

export async function getTables(adminId: bigint) {
  const restaurant = await getOwnedRestaurant(adminId);
  const tables = await prisma.table.findMany({
    where: { restaurant_id: restaurant.id },
    orderBy: [{ grid_row: 'asc' }, { grid_col: 'asc' }],
  });
  return serializeBigInt(tables);
}

export async function createTable(adminId: bigint, input: CreateTableInput) {
  const restaurant = await getOwnedRestaurant(adminId);

  // Validate grid boundaries
  if (input.grid_row >= restaurant.grid_rows || input.grid_col >= restaurant.grid_cols) {
    throw new AppError(
      400,
      `Grid position (${input.grid_row}, ${input.grid_col}) is outside the floor plan (${restaurant.grid_rows}×${restaurant.grid_cols})`
    );
  }

  // Check for existing table at this cell
  const cellOccupied = await prisma.table.findFirst({
    where: {
      restaurant_id: restaurant.id,
      grid_row: input.grid_row,
      grid_col: input.grid_col,
    },
  });
  if (cellOccupied) {
    throw new AppError(409, `Grid cell (${input.grid_row}, ${input.grid_col}) is already occupied`);
  }

  // Check label uniqueness
  const labelExists = await prisma.table.findFirst({
    where: { restaurant_id: restaurant.id, label: input.label },
  });
  if (labelExists) {
    throw new AppError(409, `A table with label "${input.label}" already exists`);
  }

  const table = await prisma.table.create({
    data: { ...input, restaurant_id: restaurant.id },
  });
  return serializeBigInt(table);
}

export async function updateTable(adminId: bigint, tableId: bigint, input: UpdateTableInput) {
  const restaurant = await getOwnedRestaurant(adminId);

  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurant_id: restaurant.id },
  });
  if (!table) throw new AppError(404, 'Table not found');

  // If changing label, check uniqueness
  if (input.label && input.label !== table.label) {
    const labelExists = await prisma.table.findFirst({
      where: { restaurant_id: restaurant.id, label: input.label, NOT: { id: tableId } },
    });
    if (labelExists) throw new AppError(409, `A table with label "${input.label}" already exists`);
  }

  const updated = await prisma.table.update({ where: { id: tableId }, data: input });
  return serializeBigInt(updated);
}

export async function deleteTable(adminId: bigint, tableId: bigint) {
  const restaurant = await getOwnedRestaurant(adminId);

  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurant_id: restaurant.id },
  });
  if (!table) throw new AppError(404, 'Table not found');

  // Check for active (upcoming) reservations on this table
  const activeReservation = await prisma.reservationTable.findFirst({
    where: {
      table_id: tableId,
      reservation: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        reservation_date: { gte: new Date() },
      },
    },
  });
  if (activeReservation) {
    throw new AppError(409, 'Cannot delete a table with upcoming reservations. Cancel the reservations first.');
  }

  await prisma.table.delete({ where: { id: tableId } });
  return { deleted: true };
}

// Floor plan: return grid with reservation status for a given date
export async function getFloorPlan(adminId: bigint, date: Date) {
  const restaurant = await getOwnedRestaurant(adminId);

  const tables = await prisma.table.findMany({
    where: { restaurant_id: restaurant.id },
    include: {
      reservation_tables: {
        include: {
          reservation: {
            select: {
              id: true,
              status: true,
              start_time: true,
              end_time: true,
              guest_count: true,
              customer: { select: { id: true, name: true, phone_number: true } },
            },
          },
        },
        where: {
          reservation: {
            reservation_date: date,
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        },
      },
    },
    orderBy: [{ grid_row: 'asc' }, { grid_col: 'asc' }],
  });

  return serializeBigInt({
    restaurant: { id: restaurant.id, name: restaurant.name, grid_rows: restaurant.grid_rows, grid_cols: restaurant.grid_cols },
    tables: tables.map((t) => ({
      id: t.id,
      label: t.label,
      capacity: t.capacity,
      grid_row: t.grid_row,
      grid_col: t.grid_col,
      is_active: t.is_active,
      reservation: t.reservation_tables[0]?.reservation ?? null,
    })),
  });
}
