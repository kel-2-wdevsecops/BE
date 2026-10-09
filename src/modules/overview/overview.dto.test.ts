import { describe, expect, it } from 'vitest';
import { OverviewQuery } from './overview.dto';

describe('OverviewQuery', () => {
  it('menerima filter waktu dan geografi', () => {
    expect(OverviewQuery.parse({ year: '2004', month: '11', continent: 'Europe', country: 'Norway' }))
      .toEqual({ year: 2004, month: 11, continent: 'Europe', country: 'Norway' });
  });

  it.each([{ foo: '1' }, { year: 'abc' }, { month: '13' }, { continent: 'Mars' }, { productLine: 'Ships' }])(
    'menolak %j',
    (input) => expect(OverviewQuery.safeParse(input).success).toBe(false),
  );
});
