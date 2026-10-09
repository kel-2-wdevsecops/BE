import { describe, expect, it } from 'vitest';
import { CustomersQuery } from '../../src/modules/customers/customers.dto';
import type { CustomersResponse } from '../../src/modules/customers/customers.service';
import type { FiltersResponse } from '../../src/modules/filters/filters.service';
import { forbiddenKeys } from '../helpers/contract';
import { useApi } from '../helpers/api';

const get = useApi();
const customers = async (query = '') => {
  const res = await get<CustomersResponse>(`/dashboard/customers${query}`);
  expect(res.status).toBe(200);
  return res.body.data;
};

describe('F04 GET /dashboard/customers', () => {
  it('tanpa filter', async () => {
    const data = await customers();
    expect(data.kpi).toEqual({ customers: 122, activeCustomers: 98, prospects: 24, withoutSalesRep: 22, avgOrderValue: 29460.71 });

    expect(data.topCustomers).toHaveLength(10);
    expect(data.topCustomers.slice(0, 2)).toMatchObject([
      { customerNumber: 141, customerName: 'Euro+ Shopping Channel', country: 'Spain', sales: 820689.54, orders: 26, sharePct: 8.55 },
      { customerName: 'Mini Gifts Distributors Ltd.', sales: 591827.34, orders: 17 },
    ]);

    expect(data.salesReps).toHaveLength(17);
    expect(data.salesReps[0]).toMatchObject({ employeeNumber: 1370, name: 'Gerard Hernandez', office: 'Paris', customers: 7, orders: 43, sales: 1258577.81 });
    const rep = (name: string) => data.salesReps.find((r) => r.name === name);
    expect(rep('Pamela Castillo')?.customers).toBe(10);
    expect(rep('Barry Jones')?.customers).toBe(9);
    expect(rep('Tom King')?.customers).toBe(0);
    expect(rep('Yoshimi Kato')?.customers).toBe(0);
    expect(Math.max(...data.salesReps.map((r) => r.customers))).toBe(10);

    expect(data.offices).toHaveLength(7);
    expect(data.offices[0]).toEqual({ officeCode: '4', city: 'Paris', country: 'France', territory: 'EMEA', customers: 29, sales: 3083761.58 });
    expect(data.offices.at(-1)).toMatchObject({ city: 'Tokyo', sales: 457110.07 });
    expect(Math.round(data.offices.reduce((n, o) => n + o.sales, 0) * 100) / 100).toBe(9604190.61);

    expect(data.creditSegments.map((s) => s.customers)).toEqual([24, 0, 36, 62]);
    expect(forbiddenKeys(data)).toEqual([]);
  });

  it('filter waktu tidak memengaruhi customer terdaftar dan prospek', async () => {
    const { kpi } = await customers('?year=2005');
    expect(kpi.customers).toBe(122);
    expect(kpi.prospects).toBe(24);
    expect(kpi.activeCustomers).toBeLessThan(98);
  });

  it('negara/benua dari /filters diterima DTO (lintas-modul)', async () => {
    const { body } = await get<FiltersResponse>('/dashboard/filters');
    for (const c of body.data.continents) expect(CustomersQuery.safeParse({ continent: c }).success).toBe(true);
    for (const c of body.data.countries) expect(CustomersQuery.safeParse({ country: c.country }).success).toBe(true);
  });
});
