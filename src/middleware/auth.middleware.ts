import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { ApiResponse } from '../utils/apiResponse';
import { verifyAccessToken } from '../modules/auth/auth.service';
import type { user_role } from '../generated/prisma/client';

export async function authMiddleware(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    ApiResponse.unauthorized(res, 'Token not found. Include Authorization: Bearer <token>');
    return;
  }

  const token = authHeader.slice(7);

  try {
    // verifyAccessToken menolak refresh token (secret & `type` berbeda).
    const payload = verifyAccessToken(token);

    const user = await prisma.users.findUnique({ where: { id: payload.sub } });
    // tokenVersion berbeda = token sudah dicabut (logout, ganti password,
    // reset oleh admin) walaupun secara kriptografis masih valid.
    if (!user || user.tokenVersion !== payload.tv) {
      ApiResponse.unauthorized(res, 'Session is no longer valid. Please log in again.');
      return;
    }

    req.user   = user;
    req.userId = user.id;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      ApiResponse.unauthorized(res, 'Token has expired. Please log in again.');
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      ApiResponse.unauthorized(res, 'Invalid token.');
      return;
    }
    next(err);
  }
}

/**
 * Wajib dipasang SETELAH authMiddleware. Membatasi endpoint ke peran
 * tertentu (lihat enum `user_role` di schema.prisma).
 */
export function requireRole(...roles: user_role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      ApiResponse.forbidden(res, 'You do not have permission to perform this action.');
      return;
    }
    next();
  };
}
