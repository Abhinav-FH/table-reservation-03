import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (order matters for FK constraints)
  await prisma.reservationTable.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.table.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.admin.deleteMany();

  // ── Admin ───────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.admin.create({
    data: {
      name: 'John Admin',
      email: 'admin@restaurant.com',
      password_hash: passwordHash,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // ── Restaurant ──────────────────────────────────────
  const restaurant = await prisma.restaurant.create({
    data: {
      admin_id: admin.id,
      name: 'La Bella Vista',
      address: '123 Main Street, New York, NY 10001',
      grid_rows: 6,
      grid_cols: 8,
    },
  });
  console.log('✅ Restaurant created:', restaurant.name);

  // ── Tables ──────────────────────────────────────────
  const tablesData = [
    { label: 'T1', capacity: 2, grid_row: 0, grid_col: 0 },
    { label: 'T2', capacity: 2, grid_row: 0, grid_col: 2 },
    { label: 'T3', capacity: 4, grid_row: 1, grid_col: 1 },
    { label: 'T4', capacity: 4, grid_row: 1, grid_col: 4 },
    { label: 'T5', capacity: 4, grid_row: 3, grid_col: 0 },
    { label: 'T6', capacity: 6, grid_row: 2, grid_col: 3 },
    { label: 'T7', capacity: 6, grid_row: 4, grid_col: 5 },
    { label: 'T8', capacity: 2, grid_row: 5, grid_col: 7 },
  ];

  await prisma.table.createMany({
    data: tablesData.map((t) => ({ ...t, restaurant_id: restaurant.id })),
  });
  console.log(`✅ ${tablesData.length} tables created`);

  // ── Sample Customer ─────────────────────────────────
  const customerHash = await bcrypt.hash('Customer123!', 12);
  const customer = await prisma.customer.create({
    data: {
      name: 'Jane Customer',
      email: 'customer@example.com',
      password_hash: customerHash,
      phone_number: '+1234567890',
    },
  });
  console.log('✅ Sample customer created:', customer.email);

  console.log('\n🎉 Seed complete!');
  console.log('   Admin login:    admin@restaurant.com / Admin123!');
  console.log('   Customer login: customer@example.com / Customer123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
