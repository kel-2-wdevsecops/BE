import { describe, expect, it } from 'vitest';
import { OperationsQuery } from './operations.dto';

describe('OperationsQuery', () => {
  it('menerima tahun dan status', () => {
    expect(OperationsQuery.parse({ year: '2004', status: 'On Hold' })).toEqual({ year: 2004, status: 'On Hold' });
  });

  it.each([{ status: 'Lost' }, { country: 'USA' }, { foo: '1' }])('menolak %j', (input) => {
    expect(OperationsQuery.safeParse(input).success).toBe(false);
  });
});
