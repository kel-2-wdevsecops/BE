import { prisma } from '../../config/database';
import { Prisma } from '../../generated/prisma/client';
import { cached } from '../../lib/cache';
import { round2, toNumber, type RawNumber } from '../../lib/money';
import { sqlConditions, where } from '../../lib/sqlFilters';
import type { OperationsFilter } from './operations.dto';

// Operasional order (F05). Data adalah snapshot historis, jadi "lewat
// tenggat" dihitung relatif terhadap `asOf` (tanggal order terakhir di data),
// bukan tanggal hari ini.

export interface OperationsResponse {
  asOf: string | null;
  kpi: {
    orders:         number;
    shipped:        number;
    needsAttention: number;
    overdue:        number;
    lateShipments:  number;
    avgShipDays:    number | null;
  };
  statusBreakdown: { status: string; orders: number; sales: number }[];
  attentionOrders: {
    orderNumber:  number;
    orderDate:    string;
    requiredDate: string;
    status:       string;
    customerName: string;
    sales:        number;
    comments:     string | null;
  }[];
  shippingLeadTime: { bucket: '0-2' | '3-5' | '6-10' | '>10'; orders: number }[];
  slowestShipments: { orderNumber: number; customerName: string; days: number }[];
}

const ATTENTION = Prisma.sql`o.status IN ('On Hold', 'Disputed', 'In Process')`;
const SHIPPED = Prisma.sql`o.shippedDate IS NOT NULL`;

type Row = Record<string, RawNumber>;

async function load(filter: OperationsFilter): Promise<OperationsResponse> {
  const year = sqlConditions({ year: filter.year });
  const yearAndStatus = sqlConditions({ year: filter.year, status: filter.status });

  const [[range], [kpi], breakdown, attention, leadTime, slowest] = await Promise.all([
    prisma.$queryRaw<{ asOf: string | null }[]>`
      SELECT DATE_FORMAT(MAX(orderDate), '%Y-%m-%d') AS asOf FROM orders`,

    prisma.$queryRaw<Row[]>`
      SELECT COUNT(*) AS orders,
             SUM(o.status = 'Shipped') AS shipped,
             SUM(${ATTENTION}) AS needsAttention,
             SUM(o.shippedDate IS NULL AND o.status <> 'Cancelled'
                 AND o.requiredDate < (SELECT MAX(orderDate) FROM orders)) AS overdue,
             SUM(o.shippedDate > o.requiredDate) AS lateShipments,
             AVG(DATEDIFF(o.shippedDate, o.orderDate)) AS avgShipDays
      FROM orders o
      ${where(year)}`,

    prisma.$queryRaw<(Row & { status: string })[]>`
      SELECT o.status, COUNT(DISTINCT o.orderNumber) AS orders,
             SUM(od.quantityOrdered * od.priceEach) AS sales
      FROM orders o
      JOIN orderdetails od ON od.orderNumber = o.orderNumber
      ${where(yearAndStatus)}
      GROUP BY o.status
      ORDER BY sales DESC`,

    // `comments` dikirim apa adanya; FE merendernya sebagai teks biasa.
    prisma.$queryRaw<(Row & { orderDate: string; requiredDate: string; status: string; customerName: string; comments: string | null })[]>`
      SELECT o.orderNumber,
             DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
             DATE_FORMAT(o.requiredDate, '%Y-%m-%d') AS requiredDate,
             o.status, c.customerName, o.comments,
             SUM(od.quantityOrdered * od.priceEach) AS sales
      FROM orders o
      JOIN customers c     ON c.customerNumber = o.customerNumber
      JOIN orderdetails od ON od.orderNumber = o.orderNumber
      ${where([...yearAndStatus, ATTENTION])}
      GROUP BY o.orderNumber, o.orderDate, o.requiredDate, o.status, c.customerName, o.comments
      ORDER BY o.requiredDate, o.orderNumber`,

    prisma.$queryRaw<Row[]>`
      SELECT SUM(DATEDIFF(o.shippedDate, o.orderDate) <= 2) AS b0,
             SUM(DATEDIFF(o.shippedDate, o.orderDate) BETWEEN 3 AND 5) AS b3,
             SUM(DATEDIFF(o.shippedDate, o.orderDate) BETWEEN 6 AND 10) AS b6,
             SUM(DATEDIFF(o.shippedDate, o.orderDate) > 10) AS b10
      FROM orders o
      ${where([...year, SHIPPED])}`,

    prisma.$queryRaw<(Row & { customerName: string })[]>`
      SELECT o.orderNumber, c.customerName, DATEDIFF(o.shippedDate, o.orderDate) AS days
      FROM orders o
      JOIN customers c ON c.customerNumber = o.customerNumber
      ${where([...year, SHIPPED])}
      ORDER BY days DESC, o.orderNumber
      LIMIT 5`,
  ]);

  const buckets = leadTime[0];
  return {
    asOf: range?.asOf ?? null,
    kpi: {
      orders:         toNumber(kpi?.orders),
      shipped:        toNumber(kpi?.shipped),
      needsAttention: toNumber(kpi?.needsAttention),
      overdue:        toNumber(kpi?.overdue),
      lateShipments:  toNumber(kpi?.lateShipments),
      avgShipDays:    kpi?.avgShipDays == null ? null : round2(toNumber(kpi.avgShipDays)),
    },
    statusBreakdown: breakdown.map((r) => ({ status: r.status, orders: toNumber(r.orders), sales: round2(toNumber(r.sales)) })),
    attentionOrders: attention.map((r) => ({
      orderNumber:  toNumber(r.orderNumber),
      orderDate:    r.orderDate,
      requiredDate: r.requiredDate,
      status:       r.status,
      customerName: r.customerName,
      sales:        round2(toNumber(r.sales)),
      comments:     r.comments,
    })),
    shippingLeadTime: [
      { bucket: '0-2',  orders: toNumber(buckets?.b0) },
      { bucket: '3-5',  orders: toNumber(buckets?.b3) },
      { bucket: '6-10', orders: toNumber(buckets?.b6) },
      { bucket: '>10',  orders: toNumber(buckets?.b10) },
    ],
    slowestShipments: slowest.map((r) => ({
      orderNumber:  toNumber(r.orderNumber),
      customerName: r.customerName,
      days:         toNumber(r.days),
    })),
  };
}

export const OperationsService = {
  get: cached(load),
};
