// Wajib baris pertama, sebelum modul lain di-import — driver MySQL (`mariadb`)
// membaca kolom DATE/DATETIME (yang tidak menyimpan info zona waktu) lalu
// membuat objek Date pakai timezone LOKAL proses Node. Dikunci ke UTC supaya
// orderDate "2003-01-06" tidak bergeser sehari di mesin yang TZ-nya bukan
// UTC (Dockerfile juga set `ENV TZ=UTC`; ini jaring pengaman `npm run dev`).
process.env.TZ = 'UTC';

/* eslint-disable no-console -- log startup/shutdown server memang ke stdout. */

import './config/env'; // load dotenv first
import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const PORT = env.PORT;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log('');
    console.log(`  🚀 ${env.APP_NAME} v${env.APP_VERSION}`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  Mode    : ${env.NODE_ENV}`);
    console.log(`  URL     : ${env.APP_URL}`);
    console.log(`  API     : ${env.APP_URL}/api/v1`);
    console.log('');
  });

  // Docker mengirim SIGTERM lalu SIGKILL setelah 10 detik (stop_grace_period).
  // server.close() menunggu semua request yang sedang jalan selesai; koneksi
  // yang masih aktif setelah SHUTDOWN_TIMEOUT_MS diputus paksa, supaya proses
  // tetap keluar sendiri sebelum dibunuh.
  const SHUTDOWN_TIMEOUT_MS = 8000;
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received. Shutting down gracefully...`);

    const force = setTimeout(() => {
      console.log(`Masih ada koneksi setelah ${SHUTDOWN_TIMEOUT_MS} ms, diputus paksa.`);
      server.closeAllConnections();
    }, SHUTDOWN_TIMEOUT_MS);
    force.unref();

    server.close(async () => {
      clearTimeout(force);
      await prisma.$disconnect();
      console.log('Database disconnected. Bye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
}

bootstrap();
