import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export function errorMiddleware(
  err:   Error & { statusCode?: number; code?: string; field?: string },
  _req:  Request,
  res:   Response,
  _next: NextFunction,
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    // zod 4: daftar error ada di `issues`; path bisa berisi symbol. Path
    // kosong = seluruh body salah (Express 5: req.body undefined kalau
    // request tidak membawa body JSON).
    const errors = err.issues.reduce<Record<string, string>>(
      (acc, e) => ({ ...acc, [e.path.map(String).join('.') || 'body']: e.message }),
      {},
    );
    res.status(422).json({ success: false, message: 'Validation failed', data: null, errors });
    return;
  }

  // Custom statusCode (dilempar dari service, lihat utils/httpError.ts)
  if (err.statusCode) {
    const errors = err.field ? { [err.field]: err.message } : undefined;
    res.status(err.statusCode).json({ success: false, message: err.message, data: null, ...(errors && { errors }) });
    return;
  }

  // Prisma known errors (deteksi lewat kode error)
  if (err.code === 'P2025') {
    res.status(404).json({ success: false, message: 'Data not found.', data: null });
    return;
  }
  if (err.code === 'P2002') {
    res.status(409).json({ success: false, message: 'Data already exists (duplicate).', data: null });
    return;
  }
  // Foreign key classicmodels semuanya ON DELETE/UPDATE RESTRICT: menghapus
  // baris yang masih dirujuk (mis. customer yang punya order) atau merujuk
  // baris yang tidak ada berakhir di sini, bukan 500.
  if (err.code === 'P2003') {
    res.status(409).json({
      success: false,
      message: 'Operation violates a relation: the referenced data does not exist or is still in use.',
      data: null,
    });
    return;
  }

  // Default 500
  const message = env.isDev ? err.message : 'Internal server error. Please try again.';
  const stack   = env.isDev ? err.stack    : undefined;

  // eslint-disable-next-line no-console
  console.error('[ERROR]', err.message, err.stack);

  res.status(500).json({ success: false, message, data: null, ...(stack ? { stack } : {}) });
}
