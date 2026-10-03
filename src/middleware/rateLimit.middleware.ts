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

// Batas umum seluruh /api/v1 (per IP). API ini publik tanpa login, jadi
// limiter inilah yang menahan banjir request. FE dashboard hanya memanggil
// satu endpoint setiap kali filter berubah, jadi 120/menit tetap longgar.
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit:    120,
});

// "/" dan "/health" dipanggil CI/CD tiap deploy dan bisa juga monitoring.
export const healthLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit:    60,
});
