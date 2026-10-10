import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/database';
import { toNumber, type RawNumber } from '../../src/lib/money';
import { forbiddenKeys } from '../helpers/contract';
import { useApi } from '../helpers/api';

// F00: memastikan DB tes berisi dump yang benar (angka total PRD §3) dan alat
// bantu tes kontrak bekerja. Asersi tiap endpoint ada di file fiturnya.

const get = useApi();

describe('dump classicmodels', () => {
  it('total penjualan, profit, dan jumlah baris sesuai PRD', async () => {
    const [row] = await prisma.$queryRaw<{ sales: RawNumber; profit: RawNumber }[]>`
      SELECT SUM(od.quantityOrdered * od.priceEach) AS sales,
             SUM(od.quantityOrdered * (od.priceEach - p.buyPrice)) AS profit
      FROM orderdetails od JOIN products p ON p.productCode = od.productCode`;
    expect(toNumber(row.sales)).toBe(9604190.61);
    expect(toNumber(row.profit)).toBe(3825880.25);

    expect(await prisma.customers.count()).toBe(122);
    expect(await prisma.employees.count()).toBe(23);
    expect(await prisma.products.count()).toBe(110);
    expect(await prisma.orders.count()).toBe(326);
  });

  it('health check menyambung ke DB', async () => {
    const res = await get<{ status: string }>('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('forbiddenKeys', () => {
  it('menemukan kunci terlarang di mana pun', () => {
    expect(forbiddenKeys({ a: [{ phone: 1 }], b: { addressLine1: 'x', ok: { creditLimit: 0 } } }))
      .toEqual(['$.a[0].phone', '$.b.addressLine1', '$.b.ok.creditLimit']);
  });

  it('objek bersih = kosong', () => {
    expect(forbiddenKeys({ customerName: 'x', sales: 1, list: [1, 'a', null] })).toEqual([]);
  });
});
