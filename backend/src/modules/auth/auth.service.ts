import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { hashPassword, comparePassword, hashToken } from '../../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { serializeBigInt } from '../../utils/serialize';
import type {
  CustomerRegisterInput,
  AdminRegisterInput,
  LoginInput,
} from './auth.schema';

// Compute refresh token expiry from env string (e.g. "7d" → 7 days from now)
function getRefreshExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}

function buildTokenResponse(id: bigint, role: 'CUSTOMER' | 'ADMIN', name: string, email: string) {
  const sub = id.toString();
  const accessToken = signAccessToken({ sub, role });

  // Use a random jti (JWT ID) as the raw refresh token value
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const refreshToken = signRefreshToken({ sub, role, jti: rawRefreshToken });

  return {
    accessToken,
    refreshToken,
    rawRefreshToken, // stored (hashed) in DB
    user: serializeBigInt({ id, name, email, role }),
  };
}

// ── Customer Auth ───────────────────────────────────────────────────────────

export async function registerCustomer(input: CustomerRegisterInput) {
  const existing = await prisma.customer.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'An account with this email already exists');

  const password_hash = await hashPassword(input.password);
  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      email: input.email,
      password_hash,
      phone_number: input.phone_number,
    },
  });

  const tokens = buildTokenResponse(customer.id, 'CUSTOMER', customer.name, customer.email);

  await prisma.refreshToken.create({
    data: {
      token_hash: hashToken(tokens.rawRefreshToken),
      owner_type: 'CUSTOMER',
      customer_id: customer.id,
      expires_at: getRefreshExpiry(),
    },
  });

  return { tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, user: tokens.user };
}

export async function loginCustomer(input: LoginInput) {
  const customer = await prisma.customer.findUnique({ where: { email: input.email } });
  if (!customer) throw new AppError(401, 'Invalid email or password');

  const valid = await comparePassword(input.password, customer.password_hash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const tokens = buildTokenResponse(customer.id, 'CUSTOMER', customer.name, customer.email);

  await prisma.refreshToken.create({
    data: {
      token_hash: hashToken(tokens.rawRefreshToken),
      owner_type: 'CUSTOMER',
      customer_id: customer.id,
      expires_at: getRefreshExpiry(),
    },
  });

  return { tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, user: tokens.user };
}

// ── Admin Auth ──────────────────────────────────────────────────────────────

export async function registerAdmin(input: AdminRegisterInput) {
  const existing = await prisma.admin.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'An account with this email already exists');

  const password_hash = await hashPassword(input.password);
  const admin = await prisma.admin.create({
    data: { name: input.name, email: input.email, password_hash },
  });

  const tokens = buildTokenResponse(admin.id, 'ADMIN', admin.name, admin.email);

  await prisma.refreshToken.create({
    data: {
      token_hash: hashToken(tokens.rawRefreshToken),
      owner_type: 'ADMIN',
      admin_id: admin.id,
      expires_at: getRefreshExpiry(),
    },
  });

  return { tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, user: tokens.user };
}

export async function loginAdmin(input: LoginInput) {
  const admin = await prisma.admin.findUnique({ where: { email: input.email } });
  if (!admin) throw new AppError(401, 'Invalid email or password');

  const valid = await comparePassword(input.password, admin.password_hash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const tokens = buildTokenResponse(admin.id, 'ADMIN', admin.name, admin.email);

  await prisma.refreshToken.create({
    data: {
      token_hash: hashToken(tokens.rawRefreshToken),
      owner_type: 'ADMIN',
      admin_id: admin.id,
      expires_at: getRefreshExpiry(),
    },
  });

  return { tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, user: tokens.user };
}

// ── Shared: Refresh & Logout ─────────────────────────────────────────────────

export async function refreshAccessToken(rawRefreshToken: string) {
  // 1. Verify JWT signature first
  const payload = verifyRefreshToken(rawRefreshToken);

  // 2. Check DB for the hashed token
  const stored = await prisma.refreshToken.findUnique({
    where: { token_hash: hashToken(payload.jti) },
  });
  if (!stored) throw new AppError(401, 'Refresh token has been revoked');
  if (stored.expires_at < new Date()) throw new AppError(401, 'Refresh token has expired');

  // 3. Issue new access token (refresh token stays the same)
  const accessToken = signAccessToken({ sub: payload.sub, role: payload.role });
  return { accessToken };
}

export async function logout(rawRefreshToken: string) {
  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    await prisma.refreshToken.deleteMany({
      where: { token_hash: hashToken(payload.jti) },
    });
  } catch {
    // Silently fail — if token is invalid, it's already "logged out"
  }
}