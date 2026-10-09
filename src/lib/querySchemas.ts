import { z } from 'zod';
import { CONTINENTS, COUNTRIES } from './continents';

// Skema query string bersama. DTO tiap modul menyusunnya dengan
// `z.object({...}).strict()`, sehingga parameter tak dikenal juga ditolak 422.
// Endpoint publik: nilai asing ditolak, bukan ditebak. Parameter kosong
// (`?year=`) dianggap tidak diisi, karena form FE bisa mengirimnya begitu.

export const ORDER_STATUSES = ['Cancelled', 'Disputed', 'In Process', 'On Hold', 'Resolved', 'Shipped'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());

// Tahun tanpa data menghasilkan nol, bukan error; rentangnya hanya penjaga.
export const year      = optional(z.coerce.number().int().min(2000).max(2100));
export const month     = optional(z.coerce.number().int().min(1).max(12));
export const continent = optional(z.enum(CONTINENTS));
export const country   = optional(z.enum(COUNTRIES));
export const status    = optional(z.enum(ORDER_STATUSES));

// `?productLine=A&productLine=B` datang sebagai array dari Express 5; satu
// nilai sebagai string. Nama tak dikenal yang lolos regex menghasilkan nol.
export const productLine = z.preprocess(
  (v) => (v === undefined || v === '' ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.string().max(50).regex(/^[A-Za-z &]+$/)).max(7),
);
