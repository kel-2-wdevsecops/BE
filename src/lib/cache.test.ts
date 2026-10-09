import { describe, expect, it, vi } from 'vitest';
import { cached } from './cache';

describe('cached', () => {
  it('filter yang sama tidak memanggil loader lagi', async () => {
    const load = vi.fn(async (f: { year?: number; productLine: string[] }) => f.productLine.length);
    const get = cached(load);

    await get({ year: 2004, productLine: ['Ships', 'Trains'] });
    await get({ productLine: ['Trains', 'Ships'], year: 2004 });
    expect(load).toHaveBeenCalledTimes(1);

    await get({ year: 2005, productLine: [] });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('error tidak di-cache', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue(1);
    const get = cached(load);

    await expect(get({})).rejects.toThrow('db down');
    await expect(get({})).resolves.toBe(1);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
