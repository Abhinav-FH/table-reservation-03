import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { serializeBigInt } from '../../utils/serialize';
import { addTwoHours, validateBookingDate, validateBookingTime } from '../../utils/timeSlot';
import type {
  CreateReservationInput,
  UpdateReservationInput,
  AvailabilityQuery,
  ListReservationsQuery,
  AdminUpdateStatusInput,
} from './reservation.schema';

// ─── Type for an available table candidate ────────────────────────────────
interface TableCandidate {
  id: bigint;
  capacity: number;
  label: string;
}

// ─── CORE: Find booked table IDs for a given time window ─────────────────
// Overlap condition: existingStart < newEnd AND existingEnd > newStart
async function getBookedTableIds(
  restaurantId: bigint,
  date: Date,
  startTime: string,
  endTime: string,
  excludeReservationId?: bigint
): Promise<Set<bigint>> {
  const conflicting = await prisma.reservationTable.findMany({
    where: {
      reservation: {
        restaurant_id: restaurantId,
        reservation_date: date,
        status: { in: ['PENDING', 'CONFIRMED'] },
        start_time: { lt: endTime },
        end_time: { gt: startTime },
        ...(excludeReservationId ? { NOT: { id: excludeReservationId } } : {}),
      },
    },
    select: { table_id: true },
  });
  return new Set(conflicting.map((r) => r.table_id));
}

// ─── PHASE 1: Find best single table (smallest capacity >= guests) ────────
function findBestSingleTable(
  candidates: TableCandidate[],
  bookedIds: Set<bigint>
): TableCandidate | null {
  // Candidates are already ordered by capacity ASC from the DB query
  return candidates.find((t) => !bookedIds.has(t.id)) ?? null;
}

// ─── PHASE 2: Find best pair of 2 tables ─────────────────────────────────
function findBestTablePair(
  available: TableCandidate[], // all available tables (any capacity)
  guests: number
): [TableCandidate, TableCandidate] | null {
  const pairs: Array<{ a: TableCandidate; b: TableCandidate; total: number }> = [];

  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const a = available[i]!;
      const b = available[j]!;
      const total = a.capacity + b.capacity;
      if (total >= guests) {
        pairs.push({ a, b, total });
      }
    }
  }

  if (pairs.length === 0) return null;

  // Sort by: 1) total capacity ASC (minimize waste), 2) max individual capacity ASC (preserve large tables)
  pairs.sort((x, y) => {
    if (x.total !== y.total) return x.total - y.total;
    return Math.max(x.a.capacity, x.b.capacity) - Math.max(y.a.capacity, y.b.capacity);
  });

  const best = pairs[0]!;
  return [best.a, best.b];
}

// ─── MAIN AUTO-ASSIGN ─────────────────────────────────────────────────────
async function autoAssign(
  restaurantId: bigint,
  date: Date,
  startTime: string,
  guests: number,
  excludeReservationId?: bigint
): Promise<TableCandidate[]> {
  const endTime = addTwoHours(startTime);
  const bookedIds = await getBookedTableIds(restaurantId, date, startTime, endTime, excludeReservationId);

  // Phase 1: try single table with capacity >= guests
  const singleCandidates = await prisma.table.findMany({
    where: {
      restaurant_id: restaurantId,
      is_active: true,
      capacity: { gte: guests },
    },
    select: { id: true, capacity: true, label: true },
    orderBy: { capacity: 'asc' }, // smallest first = best fit
  });

  const single = findBestSingleTable(singleCandidates, bookedIds);
  if (single) return [single];

  // Phase 2: try combining 2 tables
  const allAvailable = await prisma.table.findMany({
    where: {
      restaurant_id: restaurantId,
      is_active: true,
    },
    select: { id: true, capacity: true, label: true },
    orderBy: { capacity: 'asc' },
  });

  const availableForPairing = allAvailable.filter((t) => !bookedIds.has(t.id));
  const pair = findBestTablePair(availableForPairing, guests);

  if (!pair) {
    throw new AppError(
      409,
      `No tables available for ${guests} guest${guests > 1 ? 's' : ''} on the selected date and time. Please try a different time.`
    );
  }

  return pair;
}

// ─── STATUS TRANSITION GUARD ──────────────────────────────────────────────
const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  CANCELLED: [], // Final state
  COMPLETED: [], // Final state
};

function assertValidTransition(current: ReservationStatus, next: ReservationStatus): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    if (current === 'CANCELLED' || current === 'COMPLETED') {
      throw new AppError(403, `Cannot change a ${current.toLowerCase()} reservation`);
    }
    throw new AppError(403, `Cannot transition from ${current} to ${next}`);
  }
}

// ─── PUBLIC SERVICE METHODS ───────────────────────────────────────────────

export async function checkAvailability(restaurantId: bigint, query: AvailabilityQuery) {
  validateBookingTime(query.time);
  const date = validateBookingDate(query.date);
  const endTime = addTwoHours(query.time);

  const bookedIds = await getBookedTableIds(restaurantId, date, query.time, endTime);

  // Phase 1: single table check
  const singles = await prisma.table.findMany({
    where: { restaurant_id: restaurantId, is_active: true, capacity: { gte: query.guests } },
    select: { id: true, capacity: true, label: true },
    orderBy: { capacity: 'asc' },
  });
  const single = findBestSingleTable(singles, bookedIds);
  if (single) {
    return { available: true, tables_needed: 1, assigned_capacity: single.capacity };
  }

  // Phase 2: pair check
  const all = await prisma.table.findMany({
    where: { restaurant_id: restaurantId, is_active: true },
    select: { id: true, capacity: true, label: true },
    orderBy: { capacity: 'asc' },
  });
  const available = all.filter((t) => !bookedIds.has(t.id));
  const pair = findBestTablePair(available, query.guests);

  if (pair) {
    return { available: true, tables_needed: 2, assigned_capacity: pair[0].capacity + pair[1].capacity };
  }

  return { available: false, tables_needed: 0, assigned_capacity: 0 };
}

export async function createReservation(customerId: bigint, input: CreateReservationInput) {
  validateBookingTime(input.start_time);
  const date = validateBookingDate(input.reservation_date);
  const restaurantId = BigInt(input.restaurant_id);

  // Verify restaurant exists
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw new AppError(404, 'Restaurant not found');

  const endTime = addTwoHours(input.start_time);
  const assignedTables = await autoAssign(restaurantId, date, input.start_time, input.guest_count);

  // Create reservation + junction rows in a transaction
  const reservation = await prisma.$transaction(async (tx) => {
    const created = await tx.reservation.create({
      data: {
        customer_id: customerId,
        restaurant_id: restaurantId,
        reservation_date: date,
        start_time: input.start_time,
        end_time: endTime,
        guest_count: input.guest_count,
        special_requests: input.special_requests,
        status: 'PENDING',
      },
    });

    await tx.reservationTable.createMany({
      data: assignedTables.map((t) => ({ reservation_id: created.id, table_id: t.id })),
    });

    return tx.reservation.findUnique({
      where: { id: created.id },
      include: {
        restaurant: { select: { id: true, name: true, address: true } },
        reservation_tables: {
          include: { table: { select: { id: true, label: true, capacity: true } } },
        },
      },
    });
  });

  return serializeBigInt(reservation);
}

export async function getMyReservations(customerId: bigint, query: ListReservationsQuery) {
  const skip = (query.page - 1) * query.limit;

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where: { customer_id: customerId, ...(query.status ? { status: query.status } : {}) },
      include: {
        restaurant: { select: { id: true, name: true, address: true } },
        reservation_tables: {
          include: { table: { select: { id: true, label: true, capacity: true } } },
        },
      },
      orderBy: [{ reservation_date: 'desc' }, { start_time: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.reservation.count({
      where: { customer_id: customerId, ...(query.status ? { status: query.status } : {}) },
    }),
  ]);

  return serializeBigInt({
    data: reservations,
    pagination: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) },
  });
}

export async function getReservationById(customerId: bigint, reservationId: bigint) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, customer_id: customerId },
    include: {
      restaurant: { select: { id: true, name: true, address: true } },
      reservation_tables: {
        include: { table: { select: { id: true, label: true, capacity: true } } },
      },
    },
  });
  if (!reservation) throw new AppError(404, 'Reservation not found');
  return serializeBigInt(reservation);
}

export async function updateReservation(
  customerId: bigint,
  reservationId: bigint,
  input: UpdateReservationInput
) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, customer_id: customerId },
  });
  if (!reservation) throw new AppError(404, 'Reservation not found');
  if (reservation.status !== 'PENDING') {
    throw new AppError(403, 'Only PENDING reservations can be modified');
  }

  const newDate = input.reservation_date
    ? validateBookingDate(input.reservation_date)
    : reservation.reservation_date;

  const newStartTime = input.start_time ?? reservation.start_time;
  if (input.start_time) validateBookingTime(input.start_time);

  const newGuests = input.guest_count ?? reservation.guest_count;
  const newEndTime = addTwoHours(newStartTime);

  // Re-run auto-assign (excluding current reservation from conflict check)
  const assignedTables = await autoAssign(
    reservation.restaurant_id,
    newDate,
    newStartTime,
    newGuests,
    reservationId
  );

  const updated = await prisma.$transaction(async (tx) => {
    // Remove old table assignments
    await tx.reservationTable.deleteMany({ where: { reservation_id: reservationId } });

    // Update reservation
    await tx.reservation.update({
      where: { id: reservationId },
      data: {
        reservation_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
        guest_count: newGuests,
        ...(input.special_requests !== undefined ? { special_requests: input.special_requests } : {}),
      },
    });

    // Create new table assignments
    await tx.reservationTable.createMany({
      data: assignedTables.map((t) => ({ reservation_id: reservationId, table_id: t.id })),
    });

    return tx.reservation.findUnique({
      where: { id: reservationId },
      include: {
        restaurant: { select: { id: true, name: true, address: true } },
        reservation_tables: {
          include: { table: { select: { id: true, label: true, capacity: true } } },
        },
      },
    });
  });

  return serializeBigInt(updated);
}

export async function cancelReservation(customerId: bigint, reservationId: bigint) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, customer_id: customerId },
  });
  if (!reservation) throw new AppError(404, 'Reservation not found');

  assertValidTransition(reservation.status, 'CANCELLED');

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 'CANCELLED' },
  });
  return serializeBigInt(updated);
}

// ── Admin-facing reservation methods ────────────────────────────────────────

export async function adminListReservations(adminId: bigint, query: ListReservationsQuery & { date?: string }) {
  const restaurant = await prisma.restaurant.findUnique({ where: { admin_id: adminId } });
  if (!restaurant) throw new AppError(404, 'Restaurant not found');

  const skip = (query.page - 1) * query.limit;
  const dateFilter = query.date ? new Date(query.date) : undefined;

  const where = {
    restaurant_id: restaurant.id,
    ...(query.status ? { status: query.status } : {}),
    ...(dateFilter ? { reservation_date: dateFilter } : {}),
  };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone_number: true } },
        reservation_tables: {
          include: { table: { select: { id: true, label: true, capacity: true } } },
        },
      },
      orderBy: [{ reservation_date: 'desc' }, { start_time: 'asc' }],
      skip,
      take: query.limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return serializeBigInt({
    data: reservations,
    pagination: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) },
  });
}

export async function adminUpdateStatus(
  adminId: bigint,
  reservationId: bigint,
  input: AdminUpdateStatusInput
) {
  const restaurant = await prisma.restaurant.findUnique({ where: { admin_id: adminId } });
  if (!restaurant) throw new AppError(404, 'Restaurant not found');

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurant_id: restaurant.id },
  });
  if (!reservation) throw new AppError(404, 'Reservation not found');

  assertValidTransition(reservation.status, input.status as ReservationStatus);

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: input.status },
    include: {
      customer: { select: { id: true, name: true, email: true, phone_number: true } },
      reservation_tables: {
        include: { table: { select: { id: true, label: true, capacity: true } } },
      },
    },
  });
  return serializeBigInt(updated);
}

export async function adminGetCustomers(adminId: bigint) {
  const restaurant = await prisma.restaurant.findUnique({ where: { admin_id: adminId } });
  if (!restaurant) throw new AppError(404, 'Restaurant not found');

  const customers = await prisma.customer.findMany({
    where: {
      reservations: { some: { restaurant_id: restaurant.id } },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone_number: true,
      created_at: true,
      _count: { select: { reservations: { where: { restaurant_id: restaurant.id } } } },
    },
    orderBy: { name: 'asc' },
  });
  return serializeBigInt(customers);
}
