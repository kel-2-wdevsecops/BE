// Ambang yang dipakai lebih dari satu fitur (F02 produk, F07 insight). Ini
// asumsi tim, bukan aturan dari data; ubah di sini saja.

/** Produk dengan stok di bawah ini ditandai `lowStock`. */
export const LOW_STOCK_THRESHOLD = 100;

/** Insight `customer-concentration`: porsi 2 customer teratas (persen). */
export const CONCENTRATION_PCT = 10;

/** Insight `seasonality`: bulan teramai ≥ rasio ini × rata-rata order bulanan. */
export const SEASONALITY_RATIO = 1.5;
