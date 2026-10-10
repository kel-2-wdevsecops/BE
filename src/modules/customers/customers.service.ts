import { prisma } from '../../config/database';
import { Prisma } from '../../generated/prisma/client';
import { cached } from '../../lib/cache';
import { pct, round2, toNumber, type RawNumber } from '../../lib/money';
import { sqlConditions, where } from '../../lib/sqlFilters';
import type { CustomersFilter } from './customers.dto';

// Pelanggan dan tim sales (F04). Atribusi penjualan ke sales rep dan kantor
// memakai penugasan saat ini (customers.salesRepEmployeeNumber →
// employees.officeCode); dump tidak menyimpan riwayatnya.
// Filter waktu memengaruhi penjualan, order, customer aktif, dan rata-rata
// nilai order; customer terdaftar, prospek, dan segmen credit limit hanya
// terpengaruh filter geografi.
// Minimasi data (PRD §9): hanya nama perusahaan customer serta nama dan
// kantor sales rep. Kontak, alamat, email, dan credit limit per customer
// tidak pernah di-SELECT.

export interface CustomersResponse {
  kpi: {
    customers:       number;
    activeCustomers: number;
    prospects:       number;
    withoutSalesRep: number;
    avgOrderValue:   number | null;
  };
  topCustomers: { customerNumber: number; customerName: string; country: string; sales: number; orders: number; sharePct: number | null }[];
  salesReps:    { employeeNumber: number; name: string; office: string; customers: number; orders: number; sales: number }[];
  offices:      { officeCode: string; city: string; country: string; territory: string; customers: number; sales: number }[];
  creditSegments: { segment: 'none' | 'low' | 'medium' | 'high'; label: string; customers: number }[];
}

type Row = Record<string, RawNumber>;

const HAS_REP = Prisma.sql`c.salesRepEmployeeNumber IS NOT NULL`;

async function load(filter: CustomersFilter): Promise<CustomersResponse> {
  const geo = sqlConditions({ continent: filter.continent, country: filter.country });
  const all = where([...geo, ...sqlConditions({ year: filter.year })]);

  const [[registered], [sold], top, repCustomers, repSales, employees, offices] = await Promise.all([
    // Segmen credit limit (PRD F04): none = 0, low > 0 dan < 10.000,
    // medium 10.000–75.000 (inklusif), high > 75.000. Hanya jumlah.
    prisma.$queryRaw<Row[]>`
      SELECT COUNT(*) AS customers,
             SUM(NOT EXISTS (SELECT 1 FROM orders o WHERE o.customerNumber = c.customerNumber)) AS prospects,
             SUM(c.salesRepEmployeeNumber IS NULL) AS withoutSalesRep,
             SUM(COALESCE(c.creditLimit, 0) = 0) AS creditNone,
             SUM(c.creditLimit > 0 AND c.creditLimit < 10000) AS creditLow,
             SUM(c.creditLimit BETWEEN 10000 AND 75000) AS creditMedium,
             SUM(c.creditLimit > 75000) AS creditHigh
      FROM customers c
      ${where(geo)}`,

    prisma.$queryRaw<Row[]>`
      SELECT SUM(od.quantityOrdered * od.priceEach) AS sales,
             COUNT(DISTINCT o.orderNumber) AS orders,
             COUNT(DISTINCT o.customerNumber) AS activeCustomers
      FROM orderdetails od
      JOIN orders o    ON o.orderNumber = od.orderNumber
      JOIN customers c ON c.customerNumber = o.customerNumber
      ${all}`,

    prisma.$queryRaw<(Row & { customerName: string; country: string })[]>`
      SELECT c.customerNumber, c.customerName, TRIM(c.country) AS country,
             SUM(od.quantityOrdered * od.priceEach) AS sales,
             COUNT(DISTINCT o.orderNumber) AS orders
      FROM orderdetails od
      JOIN orders o    ON o.orderNumber = od.orderNumber
      JOIN customers c ON c.customerNumber = o.customerNumber
      ${all}
      GROUP BY c.customerNumber, c.customerName, TRIM(c.country)
      ORDER BY sales DESC
      LIMIT 10`,

    prisma.$queryRaw<Row[]>`
      SELECT c.salesRepEmployeeNumber AS rep, COUNT(*) AS customers
      FROM customers c
      ${where([...geo, HAS_REP])}
      GROUP BY c.salesRepEmployeeNumber`,

    prisma.$queryRaw<Row[]>`
      SELECT c.salesRepEmployeeNumber AS rep,
             SUM(od.quantityOrdered * od.priceEach) AS sales,
             COUNT(DISTINCT o.orderNumber) AS orders
      FROM orderdetails od
      JOIN orders o    ON o.orderNumber = od.orderNumber
      JOIN customers c ON c.customerNumber = o.customerNumber
      ${where([...geo, ...sqlConditions({ year: filter.year }), HAS_REP])}
      GROUP BY c.salesRepEmployeeNumber`,

    prisma.employees.findMany({
      select: { employeeNumber: true, firstName: true, lastName: true, jobTitle: true, officeCode: true },
    }),

    prisma.offices.findMany({
      select:  { officeCode: true, city: true, country: true, territory: true },
      orderBy: { officeCode: 'asc' },
    }),
  ]);

  const totalSales = toNumber(sold?.sales);
  const totalOrders = toNumber(sold?.orders);

  const customersOf = new Map(repCustomers.map((r) => [toNumber(r.rep), toNumber(r.customers)]));
  const salesOf = new Map(repSales.map((r) => [toNumber(r.rep), { sales: toNumber(r.sales), orders: toNumber(r.orders) }]));
  const cityOf = new Map(offices.map((o) => [o.officeCode, o.city]));

  // Kantor = jumlah semua karyawan yang memegang customer di kantor itu.
  const officeTotals = new Map<string, { customers: number; sales: number }>();
  for (const e of employees) {
    const t = officeTotals.get(e.officeCode) ?? { customers: 0, sales: 0 };
    t.customers += customersOf.get(e.employeeNumber) ?? 0;
    t.sales += salesOf.get(e.employeeNumber)?.sales ?? 0;
    officeTotals.set(e.officeCode, t);
  }

  return {
    kpi: {
      customers:       toNumber(registered?.customers),
      activeCustomers: toNumber(sold?.activeCustomers),
      prospects:       toNumber(registered?.prospects),
      withoutSalesRep: toNumber(registered?.withoutSalesRep),
      avgOrderValue:   totalOrders ? round2(totalSales / totalOrders) : null,
    },
    topCustomers: top.map((r) => ({
      customerNumber: toNumber(r.customerNumber),
      customerName:   r.customerName,
      country:        r.country,
      sales:          round2(toNumber(r.sales)),
      orders:         toNumber(r.orders),
      sharePct:       pct(toNumber(r.sales), totalSales),
    })),
    // Hanya jabatan Sales Rep, termasuk yang belum memegang customer.
    salesReps: employees
      .filter((e) => e.jobTitle === 'Sales Rep')
      .map((e) => ({
        employeeNumber: e.employeeNumber,
        name:           `${e.firstName} ${e.lastName}`,
        office:         cityOf.get(e.officeCode) ?? '',
        customers:      customersOf.get(e.employeeNumber) ?? 0,
        orders:         salesOf.get(e.employeeNumber)?.orders ?? 0,
        sales:          round2(salesOf.get(e.employeeNumber)?.sales ?? 0),
      }))
      .sort((a, b) => b.sales - a.sales || b.customers - a.customers || a.employeeNumber - b.employeeNumber),
    offices: offices
      .map((o) => ({
        ...o,
        customers: officeTotals.get(o.officeCode)?.customers ?? 0,
        sales:     round2(officeTotals.get(o.officeCode)?.sales ?? 0),
      }))
      .sort((a, b) => b.sales - a.sales),
    creditSegments: [
      { segment: 'none',   label: 'Tanpa limit (0)', customers: toNumber(registered?.creditNone) },
      { segment: 'low',    label: '< 10.000',        customers: toNumber(registered?.creditLow) },
      { segment: 'medium', label: '10.000–75.000',   customers: toNumber(registered?.creditMedium) },
      { segment: 'high',   label: '> 75.000',        customers: toNumber(registered?.creditHigh) },
    ],
  };
}

export const CustomersService = {
  get: cached(load),
};
