import { Prisma } from '../generated/prisma/client';
import { countriesIn, type Continent, type Country } from './continents';
import type { OrderStatus } from './querySchemas';

// Potongan WHERE untuk filter dashboard. Setiap nilai menjadi parameter
// terikat (`?`) lewat Prisma.sql; tidak ada nilai yang digabung ke string SQL.
// Alias tabel tetap: orders `o`, customers `c`, products `p`. Query yang
// memakai builder ini wajib memakai alias yang sama untuk tabel yang difilter.

export interface SqlFilter {
  year?:        number;
  month?:       number;
  continent?:   Continent;
  country?:     Country;
  productLine?: string[];
  status?:      OrderStatus;
}

export function sqlConditions(filter: SqlFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];
  if (filter.year !== undefined)  conditions.push(Prisma.sql`YEAR(o.orderDate) = ${filter.year}`);
  if (filter.month !== undefined) conditions.push(Prisma.sql`MONTH(o.orderDate) = ${filter.month}`);
  // TRIM: dump berisi "Norway  " di samping "Norway".
  if (filter.continent) conditions.push(Prisma.sql`TRIM(c.country) IN (${Prisma.join(countriesIn(filter.continent))})`);
  if (filter.country)   conditions.push(Prisma.sql`TRIM(c.country) = ${filter.country}`);
  if (filter.productLine?.length) conditions.push(Prisma.sql`p.productLine IN (${Prisma.join(filter.productLine)})`);
  if (filter.status)    conditions.push(Prisma.sql`o.status = ${filter.status}`);
  return conditions;
}

/** `WHERE a AND b ...`, atau kosong bila tidak ada kondisi. */
export function where(conditions: Prisma.Sql[]): Prisma.Sql {
  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
}

/** `AND a AND b ...` untuk ditempel setelah WHERE yang sudah ada. */
export function andAll(conditions: Prisma.Sql[]): Prisma.Sql {
  return conditions.length ? Prisma.sql`AND ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
}
