import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { env } from './env';

// Semua kolom Decimal di schema ini DECIMAL(10,2) (uang). Bawaan Decimal.js
// membuang nol di belakang ("136", "214.3"); dikunci ke 2 desimal supaya
// format uang di respons JSON selalu sama ("136.00", "214.30").
// Kalau suatu saat ada kolom Decimal dengan skala lain, ganti ini dengan
// format per kolom di service-nya.
Prisma.Decimal.prototype.toJSON = function toJSON(this: Prisma.Decimal) {
  return this.toFixed(2);
};

/**
 * Prisma 7 mewajibkan driver adapter (tidak bisa lagi cuma `url` di schema).
 * `@prisma/adapter-mariadb` dipakai untuk provider "mysql" — kompatibel
 * dengan server MySQL maupun MariaDB. Lihat: https://pris.ly/d/driver-adapters
 *
 * Tabel classicmodels memakai kunci yang diisi aplikasi (customerNumber,
 * productCode, ...), bukan auto-increment.
 */
function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaMariaDb(env.DATABASE_URL),
    log:     env.isDev ? ['error', 'warn'] : ['error'],
  });
}

type PrismaClientExtended = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientExtended };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.isDev) globalForPrisma.prisma = prisma;
