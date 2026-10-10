import { describe, expect, it } from 'vitest';
import { useApi } from '../helpers/api';

// DB kosong (hanya hasil `prisma migrate deploy`), kondisi yang sama dengan
// DAST ZAP di deploy.yml: setiap endpoint harus 200, tanpa NaN/Infinity.
// Fitur baru menambahkan path-nya ke daftar ini.
const ENDPOINTS = [
  '/dashboard/filters',
];

const get = useApi();

describe('DB kosong', () => {
  it.each(ENDPOINTS)('%s menjawab 200', async (path) => {
    const res = await get(path);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/NaN|Infinity/);
  });
});
