import { describe, expect, it } from 'vitest';
import { GrowthQuery } from './growth.dto';
import { yearToDate } from './growth.service';

describe('GrowthQuery', () => {
  it('hanya year', () => {
    expect(GrowthQuery.parse({ year: '2004' })).toEqual({ year: 2004 });
    expect(GrowthQuery.safeParse({ month: '1' }).success).toBe(false);
  });
});

describe('yearToDate', () => {
  const monthly = [
    { year: 2004, month: 1, sales: 100 },
    { year: 2004, month: 6, sales: 999 },
    { year: 2005, month: 1, sales: 150 },
  ];

  it('Jan s.d. bulan terakhir data vs rentang yang sama tahun sebelumnya', () => {
    expect(yearToDate(monthly, '2005-05-31')).toEqual({ year: 2005, throughMonth: 5, sales: 150, previous: 100, growthPct: 50 });
  });

  it('DB kosong = null', () => {
    expect(yearToDate([], null)).toBeNull();
  });
});
