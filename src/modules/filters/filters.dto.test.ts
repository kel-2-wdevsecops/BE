import { describe, expect, it } from 'vitest';
import { FiltersQuery } from './filters.dto';

describe('FiltersQuery', () => {
  it('tanpa parameter diterima, parameter apa pun ditolak', () => {
    expect(FiltersQuery.parse({})).toEqual({});
    expect(FiltersQuery.safeParse({ year: '2004' }).success).toBe(false);
  });
});
