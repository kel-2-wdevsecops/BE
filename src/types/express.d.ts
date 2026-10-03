import { users } from '../generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** User yang sedang login (diset oleh authMiddleware) */
      user?: users;
      /** Shortcut untuk user.id */
      userId?: string;
    }
  }
}

export {};
