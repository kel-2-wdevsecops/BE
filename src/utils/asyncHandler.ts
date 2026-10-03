import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Membungkus async route handler agar error diteruskan ke Express error middleware
 * tanpa perlu try/catch di setiap controller.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/** Ambil parameter paginasi dari query string */
// Nilai non-angka (`?page=abc`) atau array/objek dari parser `qs` jatuh ke
// default, bukan NaN yang membuat Prisma melempar 500.
function toInt(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function parsePagination(query: Record<string, unknown>) {
  const page    = Math.min(100_000, Math.max(1, toInt(query.page, 1)));
  const perPage = Math.min(100, Math.max(1, toInt(query.per_page, 15)));
  const skip    = (page - 1) * perPage;
  return { page, perPage, skip };
}
