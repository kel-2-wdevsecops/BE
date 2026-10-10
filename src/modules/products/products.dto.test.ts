import { describe, expect, it } from 'vitest';
import { ProductsQuery } from './products.dto';

describe('ProductsQuery', () => {
  it('productLine string atau array', () => {
    expect(ProductsQuery.parse({ productLine: 'Ships' })).toEqual({ productLine: ['Ships'] });
    expect(ProductsQuery.parse({ productLine: ['Classic Cars', 'Ships'], year: '2004', month: '1' }))
      .toEqual({ productLine: ['Classic Cars', 'Ships'], year: 2004, month: 1 });
    expect(ProductsQuery.parse({})).toEqual({ productLine: [] });
  });

  it.each([
    { productLine: Array(8).fill('Ships') },
    { productLine: 'Ships<script>' },
    { productLine: 'x'.repeat(51) },
    { country: 'USA' },
    { month: '13' },
  ])('menolak %j', (input) => expect(ProductsQuery.safeParse(input).success).toBe(false));
});
