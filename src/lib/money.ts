// Angka dari $queryRaw tidak datang sebagai number: COUNT sebagai bigint, SUM
// sebagai Decimal (objek), dan SUM tanpa baris sebagai null. Semua diubah ke
// number sebelum dikirim sebagai JSON (bigint bahkan tidak bisa di-serialize).

export type RawNumber = bigint | number | string | { toString(): string } | null | undefined;

export function toNumber(v: RawNumber): number {
  if (v === null || v === undefined) return 0;
  return Number(typeof v === 'object' ? v.toString() : v);
}

/** Bulat 2 desimal, untuk uang dan persen. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** `part / whole × 100`, 2 desimal; `null` bila pembaginya 0 (DB kosong). */
export const pct = (part: number, whole: number): number | null =>
  whole === 0 ? null : round2((part / whole) * 100);

export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
