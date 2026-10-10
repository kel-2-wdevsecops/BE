import { describe, expect, it } from 'vitest';
import type { FiltersResponse } from '../../src/modules/filters/filters.service';
import { OperationsQuery } from '../../src/modules/operations/operations.dto';
import type { OperationsResponse } from '../../src/modules/operations/operations.service';
import { forbiddenKeys } from '../helpers/contract';
import { useApi } from '../helpers/api';

const get = useApi();
const operations = async (query = '') => {
  const res = await get<OperationsResponse>(`/dashboard/operations${query}`);
  expect(res.status).toBe(200);
  return res.body.data;
};

describe('F05 GET /dashboard/operations', () => {
  it('tanpa filter', async () => {
    const data = await operations();
    expect(data.asOf).toBe('2005-05-31');
    expect(data.kpi).toEqual({ orders: 326, shipped: 303, needsAttention: 13, overdue: 4, lateShipments: 1, avgShipDays: 3.76 });

    expect(Object.fromEntries(data.statusBreakdown.map((s) => [s.status, [s.orders, s.sales]]))).toEqual({
      Shipped:      [303, 8865094.64],
      Cancelled:    [6, 238854.18],
      'On Hold':    [4, 169575.61],
      'In Process': [6, 135271.52],
      Resolved:     [4, 134235.88],
      Disputed:     [3, 61158.78],
    });

    expect(data.attentionOrders).toHaveLength(13);
    expect(Math.round(data.attentionOrders.reduce((n, o) => n + o.sales, 0) * 100) / 100).toBe(366005.91);
    const onHold = data.attentionOrders.filter((o) => o.status === 'On Hold');
    expect(onHold).toHaveLength(4);
    for (const o of onHold) expect(o.comments).toMatch(/credit limit/i);
    const required = data.attentionOrders.map((o) => o.requiredDate);
    expect(required).toEqual([...required].sort());

    expect(data.shippingLeadTime.map((b) => b.orders)).toEqual([99, 163, 49, 1]);
    expect(data.slowestShipments[0]).toEqual({ orderNumber: 10165, customerName: 'Dragon Souveniers, Ltd.', days: 65 });
    expect(data.slowestShipments).toHaveLength(5);
    expect(data).not.toHaveProperty('receivables');
    expect(forbiddenKeys(data)).toEqual([]);
  });

  it('status hanya memengaruhi statusBreakdown dan attentionOrders', async () => {
    const data = await operations('?status=On%20Hold');
    expect(data.kpi.orders).toBe(326);
    expect(data.statusBreakdown).toEqual([{ status: 'On Hold', orders: 4, sales: 169575.61 }]);
    expect(data.attentionOrders.every((o) => o.status === 'On Hold')).toBe(true);
  });

  it('status dari /filters diterima DTO (lintas-modul)', async () => {
    const { body } = await get<FiltersResponse>('/dashboard/filters');
    for (const status of body.data.statuses) expect(OperationsQuery.safeParse({ status }).success).toBe(true);
  });
});
