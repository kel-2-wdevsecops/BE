import { prisma } from '../../config/database';
import { cached } from '../../lib/cache';
import { continentOf, type Continent } from '../../lib/continents';
import { pct, round2, toNumber, type RawNumber } from '../../lib/money';
import { sqlConditions, where } from '../../lib/sqlFilters';
import type { OverviewFilter } from './overview.dto';

// Ringkasan penjualan (F01, halaman Home Power BI). Definisi angka: PRD §6.
//   penjualan = SUM(quantityOrdered × priceEach), semua status order
//   profit    = SUM(quantityOrdered × (priceEach − buyPrice))
// Filter waktu memengaruhi angka penjualan/order; customer terdaftar hanya
// terpengaruh filter geografi; karyawan tidak terpengaruh filter apa pun.

export interface OverviewResponse {
  kpi: {
    sales:           number;
    profit:          number;
    profitMarginPct: number | null;
    orders:          number;
    customers:       number;
    activeCustomers: number;
    employees:       number;
  };
  topCountriesBySales:  { country: string; sales: number }[];
  customersByContinent: { continent: Continent; customers: number }[];
  customersByCountry:   { country: string; continent: Continent | null; customers: number }[];
  salesByYear:          { year: number; sales: number; profit: number; isPartial: boolean }[];
}

async function load(filter: OverviewFilter): Promise<OverviewResponse> {
  const { year, month, continent, country } = filter;
  const salesWhere = where(sqlConditions({ year, month, continent, country }));
  const geoWhere   = where(sqlConditions({ continent, country }));

  const [[kpi], byCountry, byYear, customers, employees, [range]] = await Promise.all([
    prisma.$queryRaw<{ sales: RawNumber; profit: RawNumber; orders: RawNumber; activeCustomers: RawNumber }[]>`
      SELECT SUM(od.quantityOrdered * od.priceEach) AS sales,
             SUM(od.quantityOrdered * (od.priceEach - p.buyPrice)) AS profit,
             COUNT(DISTINCT o.orderNumber) AS orders,
             COUNT(DISTINCT o.customerNumber) AS activeCustomers
      FROM orderdetails od
      JOIN orders o    ON o.orderNumber = od.orderNumber
      JOIN customers c ON c.customerNumber = o.customerNumber
      JOIN products p  ON p.productCode = od.productCode
      ${salesWhere}`,

    prisma.$queryRaw<{ country: string; sales: RawNumber }[]>`
      SELECT TRIM(c.country) AS country, SUM(od.quantityOrdered * od.priceEach) AS sales
      FROM orderdetails od
      JOIN orders o    ON o.orderNumber = od.orderNumber
      JOIN customers c ON c.customerNumber = o.customerNumber
      ${salesWhere}
      GROUP BY TRIM(c.country)
      ORDER BY sales DESC
      LIMIT 5`,

    prisma.$queryRaw<{ year: RawNumber; sales: RawNumber; profit: RawNumber }[]>`
      SELECT YEAR(o.orderDate) AS year,
             SUM(od.quantityOrdered * od.priceEach) AS sales,
             SUM(od.quantityOrdered * (od.priceEach - p.buyPrice)) AS profit
      FROM orderdetails od
      JOIN orders o    ON o.orderNumber = od.orderNumber
      JOIN customers c ON c.customerNumber = o.customerNumber
      JOIN products p  ON p.productCode = od.productCode
      ${salesWhere}
      GROUP BY YEAR(o.orderDate)
      ORDER BY year`,

    prisma.$queryRaw<{ country: string; customers: RawNumber }[]>`
      SELECT TRIM(c.country) AS country, COUNT(*) AS customers
      FROM customers c
      ${geoWhere}
      GROUP BY TRIM(c.country)`,

    prisma.employees.count(),

    prisma.$queryRaw<{ lastOrder: string | null }[]>`
      SELECT DATE_FORMAT(MAX(orderDate), '%Y-%m-%d') AS lastOrder FROM orders`,
  ]);

  const sales  = toNumber(kpi?.sales);
  const profit = toNumber(kpi?.profit);

  const customersByCountry = customers
    .map((r) => ({ country: r.country, continent: continentOf(r.country), customers: toNumber(r.customers) }))
    .sort((a, b) => b.customers - a.customers || a.country.localeCompare(b.country));

  const perContinent = new Map<Continent, number>();
  for (const r of customersByCountry) {
    if (r.continent) perContinent.set(r.continent, (perContinent.get(r.continent) ?? 0) + r.customers);
  }

  return {
    kpi: {
      sales:           round2(sales),
      profit:          round2(profit),
      profitMarginPct: pct(profit, sales),
      orders:          toNumber(kpi?.orders),
      customers:       customersByCountry.reduce((n, r) => n + r.customers, 0),
      activeCustomers: toNumber(kpi?.activeCustomers),
      employees,
    },
    topCountriesBySales: byCountry.map((r) => ({ country: r.country, sales: round2(toNumber(r.sales)) })),
    customersByContinent: [...perContinent]
      .map(([continent, n]) => ({ continent, customers: n }))
      .sort((a, b) => b.customers - a.customers || a.continent.localeCompare(b.continent)),
    customersByCountry,
    salesByYear: byYear.map((r) => {
      const y = toNumber(r.year);
      return {
        year:      y,
        sales:     round2(toNumber(r.sales)),
        profit:    round2(toNumber(r.profit)),
        // Tahun yang belum lengkap di data (2005 hanya sampai Mei).
        isPartial: range?.lastOrder != null && `${y}-12-31` > range.lastOrder,
      };
    }),
  };
}

export const OverviewService = {
  get: cached(load),
};
