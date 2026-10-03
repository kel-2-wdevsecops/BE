/**
 * Cache di memori untuk hasil query yang mahal dan jarang berubah. Data
 * classicmodels hanya dibaca, jadi agregat dashboard boleh disimpan beberapa
 * menit. Endpoint publik yang dibanjiri request pun cuma menyentuh DB sekali
 * per kombinasi filter per TTL.
 *
 * Yang disimpan adalah Promise-nya: request bersamaan dengan key yang sama
 * menunggu satu query yang sama, bukan menjalankan query masing-masing.
 * Promise yang gagal langsung dibuang, supaya error DB tidak ikut di-cache.
 * Jumlah entri dibatasi `maxEntries` (yang paling lama dibuang), karena
 * key-nya berasal dari query string pengunjung.
 */
export function createTtlCache<T>(ttlMs: number, maxEntries: number) {
  const store = new Map<string, { expiresAt: number; value: Promise<T> }>();

  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const now = Date.now();
      const hit = store.get(key);
      if (hit && hit.expiresAt > now) return hit.value;

      const value = load();
      store.delete(key);
      store.set(key, { expiresAt: now + ttlMs, value });
      value.catch(() => {
        if (store.get(key)?.value === value) store.delete(key);
      });

      if (store.size > maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      return value;
    },

    get size() {
      return store.size;
    },
  };
}
