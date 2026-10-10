import { describe, expect, it } from 'vitest';
import type { GrowthResponse } from '../../src/modules/growth/growth.service';
import { forbiddenKeys } from '../helpers/contract';
import { useApi } from '../helpers/api';

const get = useApi();
const growth = async (query = '') => {
  const res = await get<GrowthResponse>(`/dashboard/growth${query}`);
  expect(res.status).toBe(200);
  return res.body.data;
};

describe('F03 GET /dashboard/growth', () => {
  it('YoY, QoQ, MoM, dan YTD', async () => {
    const data = await growth();
    expect(data.dataRange).toEqual({ from: '2003-01-06', to: '2005-05-31' });
    expect(data.yearly.map(({ year, growthPct, isPartial }) => [year, growthPct, isPartial])).toEqual([
      [2003, null, false], [2004, 36.13, false], [2005, -60.78, true],
    ]);

    const q = (year: number, quarter: number) => data.quarterly.find((r) => r.year === year && r.quarter === quarter);
    expect(q(2003, 4)?.growthPct).toBe(188.39);
    expect(q(2004, 1)).toMatchObject({ sales: 799579.31, previous: 1779084.61, growthPct: -55.06 });
    expect(q(2005, 2)?.isPartial).toBe(true);

    const m = (year: number, month: number) => data.monthly.find((r) => r.year === year && r.month === month);
    expect(m(2003, 1)?.growthPct).toBeNull();
    expect(m(2003, 12)?.growthPct).toBe(-71.99);
    expect(m(2004, 1)).toMatchObject({ sales: 292385.21, previous: 276723.25, growthPct: 5.66 });

    expect(data.ytd).toEqual({ year: 2005, throughMonth: 5, sales: 1770936.71, previous: 1235480.38, growthPct: 43.34 });
    expect(data.salesProfitByYear).toContainEqual({ year: 2004, sales: 4515905.51, profit: 1809381.14 });
    expect(JSON.stringify(data)).not.toMatch(/NaN|Infinity/);
    expect(forbiddenKeys(data)).toEqual([]);
  });

  it('year=2004: 1 baris YoY, 4 QoQ, 12 MoM, Januari tetap punya pembanding', async () => {
    const data = await growth('?year=2004');
    expect(data.yearly).toHaveLength(1);
    expect(data.quarterly).toHaveLength(4);
    expect(data.monthly).toHaveLength(12);
    expect(data.monthly[0]).toMatchObject({ month: 1, previous: 276723.25 });
    expect(data.ytd?.year).toBe(2005);
  });
});
