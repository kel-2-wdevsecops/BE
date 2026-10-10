import { describe, expect, it } from 'vitest';
import { INSIGHT_LINKS, type Insight } from '../../src/lib/insights';
import { forbiddenKeys } from '../helpers/contract';
import { useApi } from '../helpers/api';

const get = useApi();

describe('F07 GET /dashboard/insights', () => {
  it('9 insight dengan angka dari dump', async () => {
    const res = await get<Insight[]>('/dashboard/insights');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');

    const byId = Object.fromEntries(res.body.data.map((i) => [i.id, i]));
    expect(Object.keys(byId).sort()).toEqual([
      'customer-concentration', 'low-stock-top-sellers', 'orders-on-hold', 'prospects', 'seasonality',
      'top-market', 'top-product-line', 'unsold-products', 'ytd-growth',
    ]);
    expect(byId['top-product-line'].detail).toBe('Classic Cars menyumbang 40,13 % penjualan (3.853.922,49 dari 9.604.190,61).');
    expect(byId['top-market'].metric.value).toBe(34.08);
    expect(byId['customer-concentration'].metric.value).toBe(14.71);
    expect(byId['seasonality'].detail).toBe('November memuat 63 dari 326 order (19,33 %).');
    expect(byId['ytd-growth']).toMatchObject({ severity: 'positive', metric: { value: 43.34 } });
    expect(byId['unsold-products'].detail).toBe('1 produk tidak pernah terjual: 1985 Toyota Supra.');
    expect(byId['low-stock-top-sellers'].detail).toBe('1968 Ford Mustang (top 5 penjualan) tersisa 68 unit.');
    expect(byId['prospects'].metric.value).toBe(24);
    expect(byId['orders-on-hold'].detail).toBe('4 order senilai 169.575,61 tertahan karena credit limit terlampaui.');

    for (const i of res.body.data) expect(INSIGHT_LINKS).toContain(i.link);
    expect(forbiddenKeys(res.body.data)).toEqual([]);
  });

  it('parameter apa pun ditolak 422', async () => {
    expect((await get('/dashboard/insights?year=2004')).status).toBe(422);
  });
});
