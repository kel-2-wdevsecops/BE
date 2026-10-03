import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
dotenv.config();

// Versi rilis = "version" di package.json, yang dinaikkan release-please di
// setiap rilis (.github/workflows/release.yml). Path relatifnya sama dari
// src/config (dev) maupun dist/config (produksi), dan Dockerfile ikut
// menyalin package.json ke image. Health check deploy membandingkan nilai ini.
const appVersion: string = JSON.parse(
  readFileSync(path.join(__dirname, '../../package.json'), 'utf8'),
).version;

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

// Secret HMAC pendek bisa di-brute-force offline dari satu token saja.
const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT:     parseInt(process.env.PORT ?? '3008', 10),
  APP_URL:  process.env.APP_URL ?? 'http://localhost:3008',
  APP_NAME: process.env.APP_NAME ?? 'Axon Sales API',
  APP_VERSION: appVersion,

  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET:             jwtSecret,
  // Secret terpisah untuk refresh token, supaya refresh token tidak pernah
  // bisa lolos verifikasi sebagai access token (dan sebaliknya). Kalau
  // kosong, diturunkan dari JWT_SECRET (tetap beda nilai).
  JWT_REFRESH_SECRET:     process.env.JWT_REFRESH_SECRET || `${jwtSecret}:refresh`,
  JWT_EXPIRES_IN:         parseInt(process.env.JWT_EXPIRES_IN ?? '86400', 10),
  JWT_REFRESH_EXPIRES_IN: parseInt(process.env.JWT_REFRESH_EXPIRES_IN ?? '604800', 10),

  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),

  // Jumlah hop reverse proxy tepercaya ("1", "2", ...) atau "true" (= 1).
  // Kosong = 0. Tanpa proxy sungguhan, mempercayai X-Forwarded-For membuat
  // rate limiter bisa dilewati dengan memalsukan header.
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' ? 1 : parseInt(process.env.TRUST_PROXY ?? '0', 10) || 0,

  // "true" hanya kalau SEMUA akses lewat Cloudflare dan port-nya tidak bisa
  // dijangkau langsung. IP client lalu dibaca dari CF-Connecting-IP.
  BEHIND_CLOUDFLARE: process.env.BEHIND_CLOUDFLARE === 'true',

  // Fail-closed: mode dev (CORS longgar, stack trace di respons) cuma aktif
  // kalau NODE_ENV eksplisit 'development'.
  isDev:  process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV !== 'development',
} as const;
