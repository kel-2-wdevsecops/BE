import { describe, expect, it } from 'vitest';
import { CustomersQuery } from './customers.dto';

describe('CustomersQuery', () => {
  it('menerima tahun dan geografi', () => {
    expect(CustomersQuery.parse({ year: '2004', continent: 'Asia', country: 'Japan' }))
      .toEqual({ year: 2004, continent: 'Asia', country: 'Japan' });
  });

  it.each([{ month: '1' }, { country: 'Atlantis' }, { foo: '1' }])('menolak %j', (input) => {
    expect(CustomersQuery.safeParse(input).success).toBe(false);
  });
});
