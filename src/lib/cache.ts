import { createTtlCache } from '../utils/ttlCache';
import { cacheKey } from './filters';

// Konvensi cache dashboard (PRD §9): TTL 5 menit, maksimal 500 entri per
// endpoint, key dari filter yang dinormalisasi. Data dump tidak berubah, jadi
// banjir request dengan filter yang sama hanya menyentuh DB sekali per TTL.
export const CACHE_TTL_MS = 5 * 60_000;
export const CACHE_MAX_ENTRIES = 500;

/** Membungkus loader service; panggil sekali per modul (di level file). */
export function cached<F extends object, T>(load: (filter: F) => Promise<T>) {
  const cache = createTtlCache<T>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);
  return (filter: F) => cache.get(cacheKey(filter), () => load(filter));
}
