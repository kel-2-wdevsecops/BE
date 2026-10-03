/* eslint-disable no-console */
// Membuat akun admin pertama: `npm run db:seed`. Tidak ada register publik,
// jadi ini satu-satunya jalan masuk awal; akun berikutnya dibuat admin lewat
// POST /api/v1/users. Data classicmodels sendiri berasal dari dump SQL, bukan
// dari seed ini.
//
// Wajib: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (min. 8 karakter).
// Opsional: SEED_ADMIN_NAME. Kalau email sudah ada, tidak ada yang diubah.
import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const email    = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name     = process.env.SEED_ADMIN_NAME?.trim() || 'Administrator';
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.');
  if (password.length < 8) throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });
  try {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      console.log(`Akun ${email} sudah ada (role: ${existing.role}), tidak diubah.`);
      return;
    }
    await prisma.users.create({ data: { email, name, role: 'admin', password: await argon2.hash(password) } });
    console.log(`Admin ${email} dibuat.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
