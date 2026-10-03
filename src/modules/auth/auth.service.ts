import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { httpError } from '../../utils/httpError';
import type { users } from '../../generated/prisma/client';
import type { LoginInput } from './auth.dto';

interface TokenPair {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
  expires_in:    number;
}

type TokenSubject = Pick<users, 'id' | 'email' | 'role' | 'tokenVersion'>;

export interface AccessTokenPayload {
  sub:   string;
  email: string;
  role:  string;
  tv:    number;
  type:  'access';
}

interface RefreshTokenPayload {
  sub:  string;
  tv:   number;
  type: 'refresh';
}

// HS256 dikunci eksplisit di sign & verify — jangan biarkan library menerima
// algoritma lain dari header token.
const JWT_ALGORITHM = 'HS256' as const;

function signToken(user: TokenSubject, type: 'access' | 'refresh'): string {
  if (type === 'access') {
    const payload: Omit<AccessTokenPayload, 'sub'> = {
      email: user.email,
      role:  user.role,
      tv:    user.tokenVersion,
      type:  'access',
    };
    return jwt.sign(payload, env.JWT_SECRET, {
      subject: user.id, expiresIn: env.JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM,
    });
  }
  // Secret berbeda dari access token (lihat env.JWT_REFRESH_SECRET), jadi
  // refresh token tidak akan pernah lolos verifikasi di authMiddleware.
  const payload: Omit<RefreshTokenPayload, 'sub'> = { tv: user.tokenVersion, type: 'refresh' };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    subject: user.id, expiresIn: env.JWT_REFRESH_EXPIRES_IN, algorithm: JWT_ALGORITHM,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as AccessTokenPayload;
  if (payload.type !== 'access') throw new jwt.JsonWebTokenError('Token is not an access token.');
  return payload;
}

export function generateTokenPair(user: TokenSubject): TokenPair {
  return {
    access_token:  signToken(user, 'access'),
    refresh_token: signToken(user, 'refresh'),
    token_type:    'Bearer',
    expires_in:    env.JWT_EXPIRES_IN,
  };
}

// Menaikkan tokenVersion = mencabut SEMUA token (access & refresh) milik
// user ini yang sudah terbit. Dipanggil saat logout, ganti password, dan
// saat admin me-reset password / mengubah peran akun.
export async function revokeUserTokens(userId: string) {
  await prisma.users.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

// Hash argon2 dari string acak, dipakai untuk memverifikasi password saat
// email tidak ditemukan — supaya waktu respons login sama untuk email
// terdaftar maupun tidak (mencegah enumerasi email lewat timing).
const dummyHashPromise = argon2.hash('axon-dummy-password-for-timing');

/** Bentuk publik akun: tanpa password & tokenVersion. */
export function formatUser(user: users) {
  return {
    id:        user.id,
    email:     user.email,
    name:      user.name,
    role:      user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const AuthService = {
  async login(input: LoginInput) {
    const user = await prisma.users.findUnique({ where: { email: input.email.toLowerCase() } });

    const valid = await argon2.verify(user?.password ?? (await dummyHashPromise), input.password);
    if (!user || !valid) throw httpError(401, 'Invalid email or password.');

    return { user: formatUser(user), tokens: generateTokenPair(user) };
  },

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] }) as RefreshTokenPayload;
    } catch {
      throw httpError(401, 'Invalid or expired refresh token.');
    }
    if (payload.type !== 'refresh') throw httpError(401, 'Token is not a refresh token.');

    const user = await prisma.users.findUnique({ where: { id: payload.sub } });
    if (!user || user.tokenVersion !== payload.tv) throw httpError(401, 'Refresh token has been revoked.');

    return { access_token: signToken(user, 'access'), token_type: 'Bearer', expires_in: env.JWT_EXPIRES_IN };
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.users.findUniqueOrThrow({ where: { id: userId } });
    if (!(await argon2.verify(user.password, currentPassword))) {
      throw httpError(422, 'Current password does not match.', 'current_password');
    }

    // tokenVersion dinaikkan -> semua sesi lain (termasuk token yang mungkin
    // sudah dicuri) ikut tidak berlaku. Sesi yang sedang dipakai diberi
    // pasangan token baru supaya tidak ikut ter-logout.
    const updated = await prisma.users.update({
      where: { id: userId },
      data:  { password: await argon2.hash(newPassword), tokenVersion: { increment: 1 } },
    });
    return generateTokenPair(updated);
  },
};
