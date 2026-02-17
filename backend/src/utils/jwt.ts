import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './AppError';

export type TokenOwnerType = 'CUSTOMER' | 'ADMIN';

export interface AccessTokenPayload {
  sub: string; // owner id as string (BigInt serialized)
  role: TokenOwnerType;
}

export interface RefreshTokenPayload {
  sub: string;
  role: TokenOwnerType;
  jti: string; // unique token id for revocation
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }
}
