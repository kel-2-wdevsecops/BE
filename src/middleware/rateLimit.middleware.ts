import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { clientIp } from '../utils/clientIp';

// Handler seragam supaya respons 429 tetap ikut format ApiResponse, bukan
// pesan default express-rate-limit yang plain text.
const handler = (_req: Request, res: Response) => {
  ApiResponse.error(res, 'Too many requests. Please try again later.', 429);
};

// Kunci default semua limiter = IP asli client (lihat utils/clientIp.ts).
// ipKeyGenerator mengelompokkan IPv6 per subnet /56.
const ipKey = (req: Request) => ipKeyGenerator(clientIp(req));

const base = { standardHeaders: true, legacyHeaders: false, handler, keyGenerator: ipKey };

// Login — target utama brute-force/credential-stuffing, jadi paling ketat.
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit:    10,
});

// Lapis kedua untuk login, dikunci per EMAIL (bukan per IP) — menahan
// brute-force terhadap satu akun dari banyak IP sekaligus.
export const loginAccountLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit:    10,
  // Login sukses tidak dihitung — cuma percobaan gagal yang mengunci.
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email ? `login:${email}` : ipKey(req);
  },
});

// Endpoint terautentikasi yang sensitif (ganti password, kelola akun) —
// dikunci per user login, dipasang SETELAH authMiddleware.
export const sensitiveActionLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit:    20,
  keyGenerator: (req) => req.userId ?? ipKey(req),
});

// Refresh token dipanggil otomatis oleh FE tiap access token kedaluwarsa —
// lebih longgar dari login supaya sesi normal tidak ikut ke-block.
export const refreshLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit:    30,
});

// Batas umum seluruh /api/v1 (per IP, dipasang sebelum authMiddleware).
// Longgar untuk pemakaian normal FE, tapi tetap membatasi scraping seluruh
// data penjualan dan percobaan token secara massal.
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit:    300,
});

// "/" dan "/health" dipanggil CI/CD tiap deploy dan bisa juga monitoring.
export const healthLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit:    60,
});
