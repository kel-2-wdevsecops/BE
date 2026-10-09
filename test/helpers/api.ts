import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll } from 'vitest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';

// Menjalankan app sungguhan di port acak, supaya tes melewati jalur yang sama
// dengan produksi: DTO, error middleware (422), header Cache-Control.
// DB-nya dari DATABASE_URL (lihat README, "Tes angka emas").

export interface ApiResult<T = unknown> {
  status:  number;
  headers: Headers;
  body:    { success: boolean; message: string; data: T; errors?: Record<string, string> };
}

export function useApi() {
  let server: Server;
  let base = '';

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });

  return async function get<T = unknown>(path: string): Promise<ApiResult<T>> {
    const res = await fetch(base + path);
    return { status: res.status, headers: res.headers, body: await res.json() };
  };
}
