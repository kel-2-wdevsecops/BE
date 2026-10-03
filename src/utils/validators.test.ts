import { describe, expect, it } from 'vitest';
import { intParam, isoDate, money, optStr, searchQuery, strParam } from './validators';

describe('money', () => {
  it.each([['136.00', '136.00'], [0.29, '0.29'], [100, '100'], ['99999999.99', '99999999.99']])(
    'menerima %s',
    (input, expected) => expect(money.parse(input)).toBe(expected),
  );

  it.each([['-1'], ['1.234'], ['abc'], ['123456789'], [-0.5]])('menolak %s', (input) => {
    expect(money.safeParse(input).success).toBe(false);
  });
});

describe('isoDate', () => {
  it('menyimpan sebagai tengah malam UTC', () => {
    expect(isoDate.parse('2003-01-06').toISOString()).toBe('2003-01-06T00:00:00.000Z');
  });

  it('menolak format lain dan tanggal yang tidak ada', () => {
    expect(isoDate.safeParse('06/01/2003').success).toBe(false);
    expect(isoDate.safeParse('2003-02-30').success).toBe(false);
  });
});

describe('optStr', () => {
  it('string kosong menjadi null', () => {
    expect(optStr(10).parse('  ')).toBeNull();
    expect(optStr(10).parse(' NV ')).toBe('NV');
  });
});

describe('intParam', () => {
  it('mengembalikan angka untuk id valid', () => {
    expect(intParam('103', 'Customer')).toBe(103);
  });

  it.each(['abc', '0', '-1', '1.5', '99999999999'])('id "%s" dijawab 404', (value) => {
    expect(() => intParam(value, 'Customer')).toThrow(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('strParam', () => {
  it('meneruskan string non-kosong', () => {
    expect(strParam('1', 'Office')).toBe('1');
  });

  it.each([[['a', 'b']], [''], [undefined]])('%j dijawab 404', (value) => {
    expect(() => strParam(value, 'Office')).toThrow(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('searchQuery', () => {
  it('hanya string non-kosong, di-trim dan dibatasi 100 karakter', () => {
    expect(searchQuery({ search: '  euro ' })).toBe('euro');
    expect(searchQuery({ search: '   ' })).toBeUndefined();
    expect(searchQuery({ search: ['a', 'b'] })).toBeUndefined();
    expect(searchQuery({ search: 'x'.repeat(150) })).toHaveLength(100);
  });
});
