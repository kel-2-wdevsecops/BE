import { describe, expect, it } from 'vitest';
import type { FiltersResponse } from '../../src/modules/filters/filters.service';
import { ProductsQuery } from '../../src/modules/products/products.dto';
import type { ProductsResponse } from '../../src/modules/products/products.service';
import { forbiddenKeys } from '../helpers/contract';
import { useApi } from '../helpers/api';

const get = useApi();
const products = async (query = '') => {
  const res = await get<ProductsResponse>(`/dashboard/products${query}`);
  expect(res.status).toBe(200);
  return res.body.data;
};

describe('F02 GET /dashboard/products', () => {
  it('tanpa filter', async () => {
    const data = await products();
    expect(data.kpi).toMatchObject({ sales: 9604190.61, profit: 3825880.25, profitMarginPct: 39.84, orders: 326, quantity: 105516 });
    expect(data.salesByProductLine.map(({ productLine, sales }) => [productLine, sales])).toEqual([
      ['Classic Cars', 3853922.49], ['Vintage Cars', 1797559.63], ['Motorcycles', 1121426.12],
      ['Trucks and Buses', 1024113.57], ['Planes', 954637.54], ['Ships', 663998.34], ['Trains', 188532.92],
    ]);
    expect(data.salesByProductLine[0].profit).toBe(1526212.2);
    expect(data.topVendors).toEqual([
      { vendor: 'Classic Metal Creations', sales: 934554.42 },
      { vendor: 'Unimax Art Galleries', sales: 884167.33 },
      { vendor: 'Gearbox Collectibles', sales: 828013.76 },
      { vendor: 'Second Gear Diecast', sales: 803892.06 },
      { vendor: 'Exoto Designs', sales: 793392.31 },
    ]);
    expect(data.ordersByYear).toEqual([{ year: 2003, orders: 111 }, { year: 2004, orders: 151 }, { year: 2005, orders: 64 }]);
    expect(data.ordersByMonth.map((m) => m.orders)).toEqual([25, 26, 27, 29, 29, 19, 18, 17, 20, 31, 63, 22]);

    expect(data.products).toHaveLength(110);
    expect(data.products[0]).toMatchObject({ productName: '1992 Ferrari 360 Spider red', sales: 276839.98, orders: 53 });
    expect(data.products.find((p) => p.productName === '1985 Toyota Supra')).toMatchObject({ sales: 0, orders: 0 });
    expect(data.products.find((p) => p.productName === '1968 Ford Mustang')).toMatchObject({ quantityInStock: 68, lowStock: true });
    expect(forbiddenKeys(data)).toEqual([]);
  });

  it('pilihan ganda product line', async () => {
    const { kpi, products: list } = await products('?productLine=Classic%20Cars&productLine=Vintage%20Cars');
    expect(kpi.sales).toBe(5651482.12);
    expect(new Set(list.map((p) => p.productLine))).toEqual(new Set(['Classic Cars', 'Vintage Cars']));
  });

  it('product line tak dikenal = nol, bukan error', async () => {
    const data = await products('?productLine=Unknown');
    expect(data.kpi).toEqual({ sales: 0, profit: 0, profitMarginPct: null, orders: 0, quantity: 0 });
    expect(data.products).toEqual([]);
    expect(data.ordersByMonth).toHaveLength(12);
  });

  it('filter waktu tidak mengubah daftar produk', async () => {
    const data = await products('?year=2005&month=5');
    expect(data.products).toHaveLength(110);
  });

  it('product line dari /filters diterima DTO (lintas-modul)', async () => {
    const { body } = await get<FiltersResponse>('/dashboard/filters');
    expect(ProductsQuery.safeParse({ productLine: body.data.productLines }).success).toBe(true);
  });
});
