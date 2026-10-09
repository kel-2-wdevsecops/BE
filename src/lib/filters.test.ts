import { describe, expect, it } from 'vitest';
import { cacheKey } from './filters';

describe('cacheKey', () => {
  it('tidak bergantung pada urutan key', () => {
    expect(cacheKey({ year: 2004, month: 1 })).toBe(cacheKey({ month: 1, year: 2004 }));
  });

  it('mengurutkan dan men-dedup array', () => {
    expect(cacheKey({ productLine: ['Ships', 'Classic Cars', 'Ships'] }))
      .toBe(cacheKey({ productLine: ['Classic Cars', 'Ships'] }));
  });

  it('membuang nilai kosong', () => {
    expect(cacheKey({ year: undefined, country: '', productLine: [] })).toBe(cacheKey({}));
  });

  it('filter berbeda = key berbeda', () => {
    expect(cacheKey({ year: 2004 })).not.toBe(cacheKey({ year: 2005 }));
  });
});
