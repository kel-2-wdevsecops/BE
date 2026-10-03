import { IncomingMessage } from 'http';
import { isIP } from 'net';
import { env } from '../config/env';

/**
 * IP asli client. Di belakang Cloudflare (Tunnel), koneksi TCP ke app ini
 * datang dari `cloudflared`, jadi `req.ip`/alamat socket selalu sama untuk
 * semua pengunjung — IP pengunjung cuma ada di header `CF-Connecting-IP`,
 * yang selalu DITIMPA Cloudflare (nilai kiriman client dibuang) sehingga
 * tidak bisa dipalsukan selama request memang lewat Cloudflare.
 *
 * Header itu hanya dibaca kalau `BEHIND_CLOUDFLARE` aktif: kalau app bisa
 * diakses langsung tanpa Cloudflare, siapa pun bisa mengirim header itu
 * sendiri dan tiap request tampak dari "IP berbeda".
 */
export function clientIp(req: IncomingMessage & { ip?: string }): string {
  if (env.BEHIND_CLOUDFLARE) {
    const cf = req.headers['cf-connecting-ip'];
    if (typeof cf === 'string' && isIP(cf.trim())) return cf.trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? '';
}
