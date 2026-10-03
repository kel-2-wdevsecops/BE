import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Membungkus async route handler agar error diteruskan ke Express error middleware
 * tanpa perlu try/catch di setiap controller.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
