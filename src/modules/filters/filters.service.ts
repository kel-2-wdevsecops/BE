import { prisma } from '../../config/database';
import { cached } from '../../lib/cache';
import { CONTINENTS, continentOf, type Continent } from '../../lib/continents';
import { toNumber, type RawNumber } from '../../lib/money';

// Pilihan filter untuk FE (F06), dari satu sumber: nilai yang ada di sini
// pasti diterima DTO endpoint lain.

export interface FiltersResponse {
  dataRange:    { from: string | null; to: string | null };
  years:        number[];
  continents:   Continent[];
  countries:    { country: string; continent: Continent }[];
  productLines: string[];
  statuses:     string[];
}

/** Negara dari DB (sudah di-trim) yang ada di peta benua, terurut. */
export function toCountryOptions(names: string[]): FiltersResponse['countries'] {
  return [...new Set(names.map((n) => n.trim()))]
    .sort()
    .flatMap((country) => {
      const continent = continentOf(country);
      // Negara di luar peta tidak ditawarkan: DTO akan menolaknya (422).
      return continent ? [{ country, continent }] : [];
    });
}

async function load(): Promise<FiltersResponse> {
  const [[range], years, countries, productLines, statuses] = await Promise.all([
    // DATE_FORMAT: tanggal dikirim sebagai 'YYYY-MM-DD' apa adanya, tanpa
    // risiko bergeser zona waktu saat menjadi Date di Node.
    prisma.$queryRaw<{ from: string | null; to: string | null }[]>`
      SELECT DATE_FORMAT(MIN(orderDate), '%Y-%m-%d') AS \`from\`,
             DATE_FORMAT(MAX(orderDate), '%Y-%m-%d') AS \`to\`
      FROM orders`,
    prisma.$queryRaw<{ year: RawNumber }[]>`
      SELECT DISTINCT YEAR(orderDate) AS year FROM orders ORDER BY year`,
    prisma.$queryRaw<{ country: string }[]>`
      SELECT DISTINCT TRIM(country) AS country FROM customers`,
    prisma.productlines.findMany({ select: { productLine: true }, orderBy: { productLine: 'asc' } }),
    prisma.$queryRaw<{ status: string }[]>`
      SELECT DISTINCT status FROM orders ORDER BY status`,
  ]);

  return {
    dataRange:    { from: range?.from ?? null, to: range?.to ?? null },
    years:        years.map((r) => toNumber(r.year)),
    continents:   [...CONTINENTS],
    countries:    toCountryOptions(countries.map((r) => r.country)),
    productLines: productLines.map((r) => r.productLine),
    statuses:     statuses.map((r) => r.status),
  };
}

export const FiltersService = {
  get: cached(load),
};
