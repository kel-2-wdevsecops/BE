import { describe, expect, it } from 'vitest';
import type { FiltersResponse } from '../../src/modules/filters/filters.service';
import { forbiddenKeys } from '../helpers/contract';
import { useApi } from '../helpers/api';

const get = useApi();

describe('F06 GET /dashboard/filters', () => {
  it('pilihan filter sesuai dump', async () => {
    const { status, body, headers } = await get<FiltersResponse>('/dashboard/filters');
    expect(status).toBe(200);
    expect(headers.get('cache-control')).toBe('public, max-age=300');

    const data = body.data;
    expect(data.dataRange).toEqual({ from: '2003-01-06', to: '2005-05-31' });
    expect(data.years).toEqual([2003, 2004, 2005]);
    expect(data.continents).toEqual(['Africa', 'Asia', 'Europe', 'North America', 'Oceania']);
    expect(data.countries).toHaveLength(27);
    expect(data.countries.filter((c) => c.country.startsWith('Norway'))).toEqual([{ country: 'Norway', continent: 'Europe' }]);
    expect(data.productLines).toHaveLength(7);
    expect(data.statuses).toEqual(['Cancelled', 'Disputed', 'In Process', 'On Hold', 'Resolved', 'Shipped']);
    expect(forbiddenKeys(data)).toEqual([]);
  });

  it('parameter apa pun ditolak 422 tanpa header cache', async () => {
    const res = await get('/dashboard/filters?year=2004');
    expect(res.status).toBe(422);
    expect(res.headers.get('cache-control')).toBeNull();
  });
});
