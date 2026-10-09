import { describe, expect, it } from 'vitest';
import { FiltersQuery } from './filters.dto';
import { toCountryOptions } from './filters.service';

describe('FiltersQuery', () => {
  it('tanpa parameter diterima, parameter apa pun ditolak', () => {
    expect(FiltersQuery.parse({})).toEqual({});
    expect(FiltersQuery.safeParse({ year: '2004' }).success).toBe(false);
  });
});

describe('toCountryOptions', () => {
  it('trim, dedup, urut, dan membawa benua', () => {
    expect(toCountryOptions(['Norway  ', 'USA', 'Norway', 'Australia'])).toEqual([
      { country: 'Australia', continent: 'Oceania' },
      { country: 'Norway', continent: 'Europe' },
      { country: 'USA', continent: 'North America' },
    ]);
  });

  it('negara di luar peta tidak ditawarkan', () => {
    expect(toCountryOptions(['Atlantis'])).toEqual([]);
  });
});
