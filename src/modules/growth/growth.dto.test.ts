import { describe, expect, it } from 'vitest';
import { GrowthQuery } from './growth.dto';

describe('GrowthQuery', () => {
  it('hanya year', () => {
    expect(GrowthQuery.parse({ year: '2004' })).toEqual({ year: 2004 });
    expect(GrowthQuery.safeParse({ month: '1' }).success).toBe(false);
  });
});
