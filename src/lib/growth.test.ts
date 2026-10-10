import { describe, expect, it } from 'vitest';
import { growthPct, growthSeries, isPartial, periodEnd, previousPeriod, yearToDate } from './growth';

describe('previousPeriod', () => {
  it('pergantian tahun', () => {
    expect(previousPeriod({ year: 2004, index: 1 }, 'month')).toEqual({ year: 2003, index: 12 });
    expect(previousPeriod({ year: 2004, index: 1 }, 'quarter')).toEqual({ year: 2003, index: 4 });
    expect(previousPeriod({ year: 2004, index: 1 }, 'year')).toEqual({ year: 2003, index: 1 });
    expect(previousPeriod({ year: 2004, index: 7 }, 'month')).toEqual({ year: 2004, index: 6 });
  });
});

describe('periodEnd / isPartial', () => {
  it('tanggal akhir periode', () => {
    expect(periodEnd({ year: 2004, index: 2 }, 'month')).toBe('2004-02-29');
    expect(periodEnd({ year: 2005, index: 2 }, 'quarter')).toBe('2005-06-30');
    expect(periodEnd({ year: 2005, index: 1 }, 'year')).toBe('2005-12-31');
  });

  it('periode yang berakhir setelah data terakhir', () => {
    expect(isPartial({ year: 2005, index: 1 }, 'year', '2005-05-31')).toBe(true);
    expect(isPartial({ year: 2005, index: 2 }, 'quarter', '2005-05-31')).toBe(true);
    expect(isPartial({ year: 2005, index: 5 }, 'month', '2005-05-31')).toBe(false);
    expect(isPartial({ year: 2004, index: 1 }, 'year', '2005-05-31')).toBe(false);
    expect(isPartial({ year: 2004, index: 1 }, 'year', null)).toBe(false);
  });
});

describe('growthPct', () => {
  it('pembanding 0 atau tidak ada = null', () => {
    expect(growthPct(100, 0)).toBeNull();
    expect(growthPct(100, null)).toBeNull();
    expect(growthPct(4515905.51, 3317348.39)).toBe(36.13);
  });
});

describe('growthSeries', () => {
  const monthly = [
    { year: 2003, month: 11, sales: 100 },
    // Desember 2003 tanpa order: tetap pembanding Januari, bernilai 0.
    { year: 2004, month: 1, sales: 50 },
    { year: 2004, month: 2, sales: 75 },
  ];

  it('bulan kosong diisi 0 dan tetap jadi pembanding', () => {
    expect(growthSeries(monthly, 'month', '2004-02-29')).toEqual([
      { year: 2003, index: 11, sales: 100, previous: null, growthPct: null, isPartial: false },
      { year: 2003, index: 12, sales: 0, previous: 100, growthPct: -100, isPartial: false },
      { year: 2004, index: 1, sales: 50, previous: 0, growthPct: null, isPartial: false },
      { year: 2004, index: 2, sales: 75, previous: 50, growthPct: 50, isPartial: false },
    ]);
  });

  it('kuartal dan tahun diturunkan dari data bulanan', () => {
    expect(growthSeries(monthly, 'quarter', '2004-02-29').map((r) => [r.year, r.index, r.sales, r.isPartial])).toEqual([
      [2003, 4, 100, false],
      [2004, 1, 125, true],
    ]);
    expect(growthSeries(monthly, 'year', '2004-02-29')).toEqual([
      { year: 2003, index: 1, sales: 100, previous: null, growthPct: null, isPartial: false },
      { year: 2004, index: 1, sales: 125, previous: 100, growthPct: 25, isPartial: true },
    ]);
  });

  it('tanpa data = kosong', () => {
    expect(growthSeries([], 'month', null)).toEqual([]);
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
