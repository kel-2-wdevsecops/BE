import { describe, expect, it } from 'vitest';
import type { FiltersResponse } from '../../src/modules/filters/filters.service';
import { OverviewQuery } from '../../src/modules/overview/overview.dto';
import type { OverviewResponse } from '../../src/modules/overview/overview.service';
import { forbiddenKeys } from '../helpers/contract';
import { useApi } from '../helpers/api';

const get = useApi();
const overview = async (query = '') => {
  const res = await get<OverviewResponse>(`/dashboard/overview${query}`);
  expect(res.status).toBe(200);
  return res.body.data;
};

describe('F01 GET /dashboard/overview', () => {
  it('tanpa filter', async () => {
    const data = await overview();
    expect(data.kpi).toEqual({
      sales: 9604190.61, profit: 3825880.25, profitMarginPct: 39.84, orders: 326,
      customers: 122, activeCustomers: 98, employees: 23,
    });
    expect(data.customersByContinent).toEqual([
      { continent: 'Europe', customers: 64 },
      { continent: 'North America', customers: 39 },
      { continent: 'Asia', customers: 9 },
      { continent: 'Oceania', customers: 9 },
      { continent: 'Africa', customers: 1 },
    ]);
    expect(data.topCountriesBySales).toEqual([
      { country: 'USA', sales: 3273280.05 },
      { country: 'Spain', sales: 1099389.09 },
      { country: 'France', sales: 1007374.02 },
      { country: 'Australia', sales: 562582.59 },
      { country: 'New Zealand', sales: 476847.01 },
    ]);
    expect(data.salesByYear.map(({ year, sales, isPartial }) => ({ year, sales, isPartial }))).toEqual([
      { year: 2003, sales: 3317348.39, isPartial: false },
      { year: 2004, sales: 4515905.51, isPartial: false },
      { year: 2005, sales: 1770936.71, isPartial: true },
    ]);
    expect(data.customersByCountry).toHaveLength(27);
    expect(data.customersByCountry.filter((c) => c.country.startsWith('Norway')))
      .toEqual([{ country: 'Norway', continent: 'Europe', customers: 3 }]);
    expect(forbiddenKeys(data)).toEqual([]);
  });

  it('year=2004', async () => {
    const { kpi } = await overview('?year=2004');
    expect(kpi).toMatchObject({ sales: 4515905.51, profit: 1809381.14, orders: 151, customers: 122, employees: 23 });
  });

  it('filter geografi memengaruhi customer terdaftar, bukan karyawan', async () => {
    const { kpi, customersByCountry } = await overview('?country=Norway');
    expect(kpi.customers).toBe(3);
    expect(kpi.employees).toBe(23);
    expect(customersByCountry).toEqual([{ country: 'Norway', continent: 'Europe', customers: 3 }]);
  });

  it('kriteria F00 pada endpoint nyata', async () => {
    const ok = await get('/dashboard/overview');
    expect(ok.headers.get('cache-control')).toBe('public, max-age=300');

    const unknown = await get('/dashboard/overview?foo=1');
    expect(unknown.status).toBe(422);
    expect(unknown.body.errors).toHaveProperty('query');
    expect(unknown.headers.get('cache-control')).toBeNull();

    for (const q of ['year=abc', 'month=13', 'continent=Mars']) {
      expect((await get(`/dashboard/overview?${q}`)).status).toBe(422);
    }
  });

  it('nilai benua/negara dari /filters diterima DTO (lintas-modul)', async () => {
    const { body } = await get<FiltersResponse>('/dashboard/filters');
    for (const c of body.data.continents) expect(OverviewQuery.safeParse({ continent: c }).success).toBe(true);
    for (const c of body.data.countries) expect(OverviewQuery.safeParse({ country: c.country }).success).toBe(true);
  });
});
