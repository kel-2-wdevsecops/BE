import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTtlCache } from './ttlCache';

describe('createTtlCache', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('memakai hasil yang sama selama TTL, lalu memuat ulang', async () => {
    const cache = createTtlCache<number>(1000, 10);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.get('a', load)).toBe(1);
    expect(await cache.get('a', load)).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1001);
    expect(await cache.get('a', load)).toBe(2);
  });

  it('request bersamaan berbagi satu pemuatan', async () => {
    const cache = createTtlCache<number>(1000, 10);
    const load = vi.fn().mockResolvedValue(1);
    await Promise.all([cache.get('a', load), cache.get('a', load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('error tidak ikut disimpan', async () => {
    const cache = createTtlCache<number>(1000, 10);
    await expect(cache.get('a', () => Promise.reject(new Error('db down')))).rejects.toThrow('db down');
    expect(await cache.get('a', () => Promise.resolve(3))).toBe(3);
  });

  it('jumlah entri dibatasi, yang paling lama dibuang', async () => {
    const cache = createTtlCache<string>(1000, 2);
    for (const key of ['a', 'b', 'c']) await cache.get(key, () => Promise.resolve(key));
    expect(cache.size).toBe(2);
    const load = vi.fn().mockResolvedValue('a2');
    expect(await cache.get('a', load)).toBe('a2');
  });
});
