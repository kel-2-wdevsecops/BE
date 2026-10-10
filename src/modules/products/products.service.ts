import { prisma } from '../../config/database';
import { Prisma } from '../../generated/prisma/client';
import { LOW_STOCK_THRESHOLD } from '../../config/thresholds';
import { cached } from '../../lib/cache';
import { pct, round2, toNumber, type RawNumber } from '../../lib/money';
import { andAll, sqlConditions, where } from '../../lib/sqlFilters';
import type { ProductsFilter } from './products.dto';

// Analisis produk (F02, halaman Products Power BI). Definisi angka: PRD §6.
// `orders` = order berbeda yang memuat minimal satu baris dari product line
// terpilih; satu order bisa berisi beberapa product line, jadi jumlah order
// per product line tidak dijumlahkan menjadi total.

export interface ProductsResponse {
  kpi: { sales: number; profit: number; profitMarginPct: number | null; orders: number; quantity: number };
  salesByProductLine: { productLine: string; sales: number; profit: number }[];
  ordersByYear:       { year: number; orders: number }[];
  ordersByMonth:      { month: number; orders: number }[];
  topVendors:         { vendor: string; sales: number }[];
  products: {
    productCode:     string;
    productName:     string;
    productLine:     string;
    sales:           number;
    profit:          number;
    quantity:        number;
    orders:          number;
    quantityInStock: number;
    lowStock:        boolean;
  }[];
}

type Row = Record<string, RawNumber>;

// Baris penjualan: setiap baris order + order-nya + produknya.
const FROM = Prisma.sql`
  FROM orderdetails od
  JOIN orders o   ON o.orderNumber = od.orderNumber
  JOIN products p ON p.productCode = od.productCode`;

async function load(filter: ProductsFilter): Promise<ProductsResponse> {
  const time  = sqlConditions({ year: filter.year, month: filter.month });
  const lines = sqlConditions({ productLine: filter.productLine });
  const all   = where([...time, ...lines]);

  const [[kpi], byLine, byMonth, vendors, products] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT SUM(od.quantityOrdered * od.priceEach) AS sales,
             SUM(od.quantityOrdered * (od.priceEach - p.buyPrice)) AS profit,
             COUNT(DISTINCT o.orderNumber) AS orders,
             SUM(od.quantityOrdered) AS quantity
      ${FROM} ${all}`,

    prisma.$queryRaw<(Row & { productLine: string })[]>`
      SELECT p.productLine,
             SUM(od.quantityOrdered * od.priceEach) AS sales,
             SUM(od.quantityOrdered * (od.priceEach - p.buyPrice)) AS profit
      ${FROM} ${all}
      GROUP BY p.productLine
      ORDER BY sales DESC`,

    // Satu order hanya punya satu tanggal, jadi order per bulan boleh
    // dijumlahkan menjadi order per tahun.
    prisma.$queryRaw<Row[]>`
      SELECT YEAR(o.orderDate) AS year, MONTH(o.orderDate) AS month, COUNT(DISTINCT o.orderNumber) AS orders
      ${FROM} ${all}
      GROUP BY YEAR(o.orderDate), MONTH(o.orderDate)`,

    prisma.$queryRaw<(Row & { vendor: string })[]>`
      SELECT p.productVendor AS vendor, SUM(od.quantityOrdered * od.priceEach) AS sales
      ${FROM} ${all}
      GROUP BY p.productVendor
      ORDER BY sales DESC
      LIMIT 5`,

    // Semua produk pada product line terpilih, termasuk yang tidak pernah
    // terjual. Filter waktu hanya memengaruhi angka penjualan, jadi ditaruh
    // di kondisi JOIN, bukan di WHERE.
    prisma.$queryRaw<(Row & { productCode: string; productName: string; productLine: string })[]>`
      SELECT p.productCode, p.productName, p.productLine, p.quantityInStock,
             SUM(od.quantityOrdered * od.priceEach) AS sales,
             SUM(od.quantityOrdered * (od.priceEach - p.buyPrice)) AS profit,
             SUM(od.quantityOrdered) AS quantity,
             COUNT(DISTINCT o.orderNumber) AS orders
      FROM products p
      LEFT JOIN (orderdetails od JOIN orders o ON o.orderNumber = od.orderNumber ${andAll(time)})
        ON od.productCode = p.productCode
      ${where(lines)}
      GROUP BY p.productCode, p.productName, p.productLine, p.quantityInStock
      ORDER BY sales DESC, p.productCode`,
  ]);

  const sales  = toNumber(kpi?.sales);
  const profit = toNumber(kpi?.profit);

  const months = byMonth.map((r) => ({ year: toNumber(r.year), month: toNumber(r.month), orders: toNumber(r.orders) }));
  const perYear = new Map<number, number>();
  for (const m of months) perYear.set(m.year, (perYear.get(m.year) ?? 0) + m.orders);

  return {
    kpi: {
      sales:           round2(sales),
      profit:          round2(profit),
      profitMarginPct: pct(profit, sales),
      orders:          toNumber(kpi?.orders),
      quantity:        toNumber(kpi?.quantity),
    },
    salesByProductLine: byLine.map((r) => ({
      productLine: r.productLine,
      sales:       round2(toNumber(r.sales)),
      profit:      round2(toNumber(r.profit)),
    })),
    ordersByYear: [...perYear].sort(([a], [b]) => a - b).map(([y, orders]) => ({ year: y, orders })),
    // Selalu 12 baris; bulan tanpa order = 0.
    ordersByMonth: Array.from({ length: 12 }, (_, i) => ({
      month:  i + 1,
      orders: months.filter((m) => m.month === i + 1).reduce((n, m) => n + m.orders, 0),
    })),
    topVendors: vendors.map((r) => ({ vendor: r.vendor, sales: round2(toNumber(r.sales)) })),
    products: products.map((r) => ({
      productCode:     r.productCode,
      productName:     r.productName,
      productLine:     r.productLine,
      sales:           round2(toNumber(r.sales)),
      profit:          round2(toNumber(r.profit)),
      quantity:        toNumber(r.quantity),
      orders:          toNumber(r.orders),
      quantityInStock: toNumber(r.quantityInStock),
      lowStock:        toNumber(r.quantityInStock) < LOW_STOCK_THRESHOLD,
    })),
  };
}

export const ProductsService = {
  get: cached(load),
};
