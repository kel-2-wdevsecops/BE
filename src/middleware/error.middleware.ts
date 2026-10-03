import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export function errorMiddleware(
  err:   Error,
  _req:  Request,
  res:   Response,
  _next: NextFunction,
): void {
  // Query string filter dashboard yang tidak valid (?year=abc, benua yang
  // tidak dikenal, ...). zod 4: daftar error ada di `issues`; path bisa
  // berisi symbol.
  if (err instanceof ZodError) {
    const errors = err.issues.reduce<Record<string, string>>(
      (acc, e) => ({ ...acc, [e.path.map(String).join('.') || 'query']: e.message }),
      {},
    );
    res.status(422).json({ success: false, message: 'Validation failed', data: null, errors });
    return;
  }

  // Default 500
  const message = env.isDev ? err.message : 'Internal server error. Please try again.';
  const stack   = env.isDev ? err.stack    : undefined;

  // eslint-disable-next-line no-console
  console.error('[ERROR]', err.message, err.stack);

  res.status(500).json({ success: false, message, data: null, ...(stack ? { stack } : {}) });
}
