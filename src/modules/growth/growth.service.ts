import { prisma } from '../../config/database';
import { cached } from '../../lib/cache';
import { growthSeries, yearToDate, type GrowthRow, type YearToDate } from '../../lib/growth';
import { round2, toNumber, type RawNumber } from '../../lib/money';
import type { GrowthFilter } from './growth.dto';

// Pertumbuhan penjualan (F03, halaman Sales Power BI). SQL hanya mengambil
// penjualan per bulan; kuartal dan tahun diturunkan di lib/growth.ts supaya
// satu sumber. Deret selalu dihitung dari seluruh data, lalu filter `year`
// memilih baris: Januari 2004 tetap dibandingkan dengan Desember 2003.

type Row<K extends string> = Omit<GrowthRow, 'year' | 'index'> & { year: number } & Record<K, number>;

export interface GrowthResponse {
  dataRange: { from: string | null; to: string | null };
  ytd:       YearToDate | null;
  yearly:    (Omit<GrowthRow, 'index'>)[];
  quarterly: Row<'quarter'>[];
  monthly:   Row<'month'>[];
  salesProfitByYear: { year: number; sales: number; profit: number }[];
}

async function load(filter: GrowthFilter): Promise<GrowthResponse> {
  const [[range], months, years] = await Promise.all([
    prisma.$queryRaw<{ from: string | null; to: string | null }[]>`
      SELECT DATE_FORMAT(MIN(orderDate), '%Y-%m-%d') AS \`from\`,
             DATE_FORMAT(MAX(orderDate), '%Y-%m-%d') AS \`to\`
      FROM orders`,
    prisma.$queryRaw<{ year: RawNumber; month: RawNumber; sales: RawNumber }[]>`
      SELECT YEAR(o.orderDate) AS year, MONTH(o.orderDate) AS month,
             SUM(od.quantityOrdered * od.priceEach) AS sales
      FROM orderdetails od
      JOIN orders o ON o.orderNumber = od.orderNumber
      GROUP BY YEAR(o.orderDate), MONTH(o.orderDate)`,
    prisma.$queryRaw<{ year: RawNumber; sales: RawNumber; profit: RawNumber }[]>`
      SELECT YEAR(o.orderDate) AS year,
             SUM(od.quantityOrdered * od.priceEach) AS sales,
             SUM(od.quantityOrdered * (od.priceEach - p.buyPrice)) AS profit
      FROM orderdetails od
      JOIN orders o   ON o.orderNumber = od.orderNumber
      JOIN products p ON p.productCode = od.productCode
      GROUP BY YEAR(o.orderDate)
      ORDER BY year`,
  ]);

  const dataTo = range?.to ?? null;
  const monthly = months.map((r) => ({ year: toNumber(r.year), month: toNumber(r.month), sales: toNumber(r.sales) }));
  const shown = <T extends { year: number }>(rows: T[]) =>
    filter.year === undefined ? rows : rows.filter((r) => r.year === filter.year);

  return {
    dataRange: { from: range?.from ?? null, to: dataTo },
    ytd:       yearToDate(monthly, dataTo),
    yearly:    shown(growthSeries(monthly, 'year', dataTo)).map(({ index: _i, ...r }) => r),
    quarterly: shown(growthSeries(monthly, 'quarter', dataTo)).map(({ index, ...r }) => ({ ...r, quarter: index })),
    monthly:   shown(growthSeries(monthly, 'month', dataTo)).map(({ index, ...r }) => ({ ...r, month: index })),
    salesProfitByYear: shown(years.map((r) => ({
      year:   toNumber(r.year),
      sales:  round2(toNumber(r.sales)),
      profit: round2(toNumber(r.profit)),
    }))),
  };
}

export const GrowthService = {
  get: cached(load),
};
