import { describe, expect, it } from 'vitest';
import {
  buildInsights, customerConcentration, INSIGHT_LINKS, lowStockTopSellers, ordersOnHold, prospects,
  seasonality, topMarket, topProductLine, unsoldProducts, ytdGrowth, type InsightInput,
} from './insights';

// Potongan data dump (angka PRD F07).
const input: InsightInput = {
  totalSales:  9604190.61,
  totalOrders: 326,
  productLines: [{ productLine: 'Classic Cars', sales: 3853922.49 }, { productLine: 'Vintage Cars', sales: 1797559.63 }],
  countries: [{ country: 'USA', sales: 3273280.05 }, { country: 'Spain', sales: 1099389.09 }, { country: 'France', sales: 1007374.02 }],
  topCustomers: [
    { customerName: 'Euro+ Shopping Channel', sales: 820689.54 },
    { customerName: 'Mini Gifts Distributors Ltd.', sales: 591827.34 },
  ],
  ordersByMonth: [25, 26, 27, 29, 29, 19, 18, 17, 20, 31, 63, 22].map((orders, i) => ({ month: i + 1, orders })),
  ytd: { year: 2005, throughMonth: 5, growthPct: 43.34 },
  products: [
    { productName: '1992 Ferrari 360 Spider red', sales: 276839.98, quantityInStock: 8347 },
    { productName: '1968 Ford Mustang', sales: 161531.48, quantityInStock: 68 },
    { productName: '1985 Toyota Supra', sales: 0, quantityInStock: 7733 },
  ],
  prospects: 24,
  onHold: { orders: 4, sales: 169575.61, comments: ['The outstaniding balance for this customer exceeds their credit limit.'] },
};

const empty: InsightInput = {
  totalSales: 0, totalOrders: 0, productLines: [], countries: [], topCustomers: [], ordersByMonth: [],
  ytd: null, products: [], prospects: 0, onHold: { orders: 0, sales: 0, comments: [] },
};

describe('aturan insight: kondisi terpenuhi', () => {
  it('teks dan angka sesuai PRD', () => {
    expect(topProductLine(input, 100)?.detail).toBe('Classic Cars menyumbang 40,13 % penjualan (3.853.922,49 dari 9.604.190,61).');
    expect(topMarket(input, 100)?.detail).toBe('USA menyumbang 34,08 % penjualan.');
    expect(customerConcentration(input, 100)?.detail)
      .toBe('Euro+ Shopping Channel dan Mini Gifts Distributors Ltd. menyumbang 14,71 % penjualan.');
    expect(seasonality(input, 100)?.detail).toBe('November memuat 63 dari 326 order (19,33 %).');
    expect(ytdGrowth(input, 100)?.detail).toBe('Penjualan Jan–Mei 2005 naik 43,34 % dibanding Jan–Mei 2004.');
    expect(unsoldProducts(input, 100)?.detail).toBe('1 produk tidak pernah terjual: 1985 Toyota Supra.');
    expect(lowStockTopSellers(input, 100)?.detail).toBe('1968 Ford Mustang (top 5 penjualan) tersisa 68 unit.');
    expect(prospects(input, 100)?.detail).toBe('24 customer terdaftar belum pernah order.');
    expect(ordersOnHold(input, 100)?.detail).toBe('4 order senilai 169.575,61 tertahan karena credit limit terlampaui.');
  });
});

describe('aturan insight: kondisi tidak terpenuhi', () => {
  it.each([
    ['customer-concentration', customerConcentration, { totalSales: 100_000_000 }],
    ['seasonality', seasonality, { ordersByMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, orders: 27 })) }],
    ['ytd-growth', ytdGrowth, { ytd: { year: 2005, throughMonth: 5, growthPct: null } }],
    ['unsold-products', unsoldProducts, { products: input.products.slice(0, 2) }],
    ['prospects', prospects, { prospects: 0 }],
    ['orders-on-hold', ordersOnHold, { onHold: { orders: 0, sales: 0, comments: [] } }],
  ] as const)('%s', (_id, rule, patch) => {
    expect(rule({ ...input, ...patch } as InsightInput, 100)).toBeNull();
  });

  it('LOW_STOCK_THRESHOLD 50 menghilangkan low-stock-top-sellers', () => {
    expect(lowStockTopSellers(input, 50)).toBeNull();
    expect(buildInsights(input, 50).map((i) => i.id)).not.toContain('low-stock-top-sellers');
  });

  it('ytd turun menjadi warning', () => {
    expect(ytdGrowth({ ...input, ytd: { year: 2005, throughMonth: 5, growthPct: -10 } }, 100))
      .toMatchObject({ severity: 'warning', detail: 'Penjualan Jan–Mei 2005 turun 10,00 % dibanding Jan–Mei 2004.' });
  });
});

describe('buildInsights', () => {
  it('9 insight, urut warning → positive → info, link dalam whitelist', () => {
    const insights = buildInsights(input);
    expect(insights).toHaveLength(9);
    const order = { warning: 0, positive: 1, info: 2 };
    expect(insights.map((i) => order[i.severity])).toEqual([...insights.map((i) => order[i.severity])].sort());
    for (const i of insights) expect(INSIGHT_LINKS).toContain(i.link);
  });

  it('input kosong = tanpa insight', () => {
    expect(buildInsights(empty)).toEqual([]);
  });
});
