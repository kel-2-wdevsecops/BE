import { describe, expect, it } from 'vitest';
import { pct, round2, sum, toNumber } from './money';

describe('toNumber', () => {
  it('mengubah bigint, Decimal (objek), string, dan null', () => {
    expect(toNumber(326n)).toBe(326);
    expect(toNumber({ toString: () => '9604190.61' })).toBe(9604190.61);
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });
});

describe('round2 / pct / sum', () => {
  it('membulatkan 2 desimal', () => {
    expect(round2(39.84159)).toBe(39.84);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('pct aman nol', () => {
    expect(pct(3825880.25, 9604190.61)).toBe(39.84);
    expect(pct(5, 0)).toBeNull();
  });

  it('sum array kosong = 0', () => {
    expect(sum([])).toBe(0);
    expect(sum([1, 2, 3])).toBe(6);
  });
});
