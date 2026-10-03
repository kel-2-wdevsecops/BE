import { z } from 'zod';
import { httpError } from './httpError';

// Skema Zod yang dipakai bersama oleh DTO modul classicmodels. Batas panjang
// string harus mengikuti VARCHAR(n) di prisma/schema.prisma: kolom di dump
// ini tidak memakai default VARCHAR(191) Prisma.

/** String wajib, di-trim, maksimal `max` karakter. */
export const str = (max: number) => z.string().trim().min(1, 'Required').max(max);

/** String opsional; string kosong disimpan sebagai NULL. */
export const optStr = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((v) => (v === '' ? null : v));

/** Kunci INT yang diisi aplikasi (customerNumber, orderNumber, ...). */
export const intId = z.coerce.number().int().positive().max(2_147_483_647);

/**
 * DECIMAL(10,2): diterima sebagai angka atau string, diteruskan ke Prisma
 * sebagai string supaya tidak ada pembulatan floating point (0.29 * 100).
 */
export const money = z
  .union([z.number(), z.string()])
  .transform(String)
  .pipe(z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, 'Must be a non-negative amount with at most 2 decimals'));

/** Kolom DATE: "YYYY-MM-DD", disimpan sebagai tengah malam UTC. */
export const isoDate = z.string().date('Must be a date in YYYY-MM-DD format').transform((v) => new Date(`${v}T00:00:00Z`));

/**
 * Parameter path numerik (`/customers/:id`). Nilai yang bukan bilangan bulat
 * positif dijawab 404, sama seperti id yang tidak ada.
 */
export function intParam(value: string, entity: string): number {
  const parsed = intId.safeParse(value);
  if (!parsed.success) throw httpError(404, `${entity} not found.`);
  return parsed.data;
}

/** Ambil `?search=` sebagai string non-kosong, atau undefined. */
export function searchQuery(query: Record<string, unknown>): string | undefined {
  return typeof query.search === 'string' && query.search.trim() ? query.search.trim().slice(0, 100) : undefined;
}
