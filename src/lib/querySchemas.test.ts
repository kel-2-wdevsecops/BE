import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { continent, country, month, productLine, status, year } from './querySchemas';

// Contoh DTO: semua skema bersama dalam satu objek strict.
const Query = z.object({ year, month, continent, country, productLine, status }).strict();

describe('querySchemas', () => {
  it('menerima nilai valid dan mengubah tipe', () => {
    expect(Query.parse({ year: '2004', month: '11', continent: 'North America', country: 'USA', status: 'On Hold' }))
      .toEqual({ year: 2004, month: 11, continent: 'North America', country: 'USA', productLine: [], status: 'On Hold' });
  });

  it('parameter kosong = tidak diisi', () => {
    expect(Query.parse({ year: '', productLine: '' })).toEqual({ productLine: [] });
  });

  it.each([
    [{ year: 'abc' }],
    [{ year: '2004.5' }],
    [{ month: '13' }],
    [{ month: '0' }],
    [{ continent: 'Mars' }],
    [{ country: 'Atlantis' }],
    [{ status: 'Lost' }],
    [{ productLine: 'Ships;DROP' }],
    [{ productLine: Array(8).fill('Ships') }],
    [{ productLine: 'x'.repeat(51) }],
  ])('menolak %j', (input) => {
    expect(Query.safeParse(input).success).toBe(false);
  });

  it('.strict() menolak parameter tak dikenal', () => {
    const result = Query.safeParse({ foo: '1' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].code).toBe('unrecognized_keys');
  });

  it('productLine berulang diterima sebagai array', () => {
    expect(Query.parse({ productLine: ['Classic Cars', 'Ships'] }).productLine).toEqual(['Classic Cars', 'Ships']);
    expect(Query.parse({ productLine: 'Ships' }).productLine).toEqual(['Ships']);
  });
});
