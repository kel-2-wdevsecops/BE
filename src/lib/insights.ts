import { CONCENTRATION_PCT, LOW_STOCK_THRESHOLD, SEASONALITY_RATIO } from '../config/thresholds';
import { pct } from './money';

// Sorotan insight (F07). Satu fungsi murni per aturan: menerima agregat dan
// mengembalikan satu insight, atau null bila syaratnya tidak terpenuhi
// (termasuk DB kosong). Teks memakai template bahasa Indonesia, angka selalu
// dari data dan diformat id-ID di sini, supaya FE cukup merender.

export const INSIGHT_LINKS = ['/', '/produk', '/pertumbuhan', '/pelanggan', '/operasional'] as const;
export type InsightLink = (typeof INSIGHT_LINKS)[number];

export type Severity = 'warning' | 'positive' | 'info';

export interface Insight {
  id:             string;
  severity:       Severity;
  title:          string;
  detail:         string;
  recommendation: string;
  metric:         { value: number; unit: 'percent' | 'count' | 'currency' };
  link:           InsightLink;
}

export interface InsightInput {
  totalSales:   number;
  totalOrders:  number;
  productLines: { productLine: string; sales: number }[];   // terurut menurun
  countries:    { country: string; sales: number }[];       // terurut menurun
  topCustomers: { customerName: string; sales: number }[];  // terurut menurun
  ordersByMonth: { month: number; orders: number }[];
  ytd: { year: number; throughMonth: number; growthPct: number | null } | null;
  products: { productName: string; sales: number; quantityInStock: number }[]; // terurut menurun
  prospects: number;
  onHold: { orders: number; sales: number; comments: (string | null)[] };
}

const money = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n: number) => money.format(n);
const percent = (n: number) => `${num(Math.abs(n))} %`;
const monthName = (m: number, style: 'long' | 'short') =>
  new Intl.DateTimeFormat('id-ID', { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, m - 1, 1)));

type Rule = (input: InsightInput, lowStockThreshold: number) => Insight | null;

export const topProductLine: Rule = ({ productLines, totalSales }) => {
  const [top, second] = productLines;
  const share = top && pct(top.sales, totalSales);
  if (!share) return null;
  return {
    id: 'top-product-line',
    severity: 'info',
    title: `${top.productLine} adalah lini terbesar`,
    detail: `${top.productLine} menyumbang ${percent(share)} penjualan (${num(top.sales)} dari ${num(totalSales)}).`,
    recommendation: `Perluas lini ${top.productLine}${second ? ` dan ${second.productLine}` : ''}; evaluasi lini dengan penjualan rendah.`,
    metric: { value: share, unit: 'percent' },
    link: '/produk',
  };
};

export const topMarket: Rule = ({ countries, totalSales }) => {
  const [top, ...next] = countries;
  const share = top && pct(top.sales, totalSales);
  if (!share) return null;
  const expansion = next.slice(0, 2).map((c) => c.country);
  return {
    id: 'top-market',
    severity: 'info',
    title: `${top.country} adalah pasar terbesar`,
    detail: `${top.country} menyumbang ${percent(share)} penjualan.`,
    recommendation: `Perkuat pasar ${top.country}${expansion.length ? `; jadikan ${expansion.join(' dan ')} pijakan ekspansi` : ''}.`,
    metric: { value: share, unit: 'percent' },
    link: '/',
  };
};

export const customerConcentration: Rule = ({ topCustomers, totalSales }) => {
  const top2 = topCustomers.slice(0, 2);
  const share = pct(top2.reduce((n, c) => n + c.sales, 0), totalSales);
  if (top2.length < 2 || share === null || share < CONCENTRATION_PCT) return null;
  return {
    id: 'customer-concentration',
    severity: 'warning',
    title: 'Penjualan terkonsentrasi di 2 customer',
    detail: `${top2[0].customerName} dan ${top2[1].customerName} menyumbang ${percent(share)} penjualan.`,
    recommendation: 'Jaga hubungan dengan customer utama dan kurangi ketergantungan.',
    metric: { value: share, unit: 'percent' },
    link: '/pelanggan',
  };
};

export const seasonality: Rule = ({ ordersByMonth, totalOrders }) => {
  const peak = [...ordersByMonth].sort((a, b) => b.orders - a.orders)[0];
  const share = peak && pct(peak.orders, totalOrders);
  if (!peak || !share || peak.orders < SEASONALITY_RATIO * (totalOrders / 12)) return null;
  const name = monthName(peak.month, 'long');
  return {
    id: 'seasonality',
    severity: 'info',
    title: `${name} adalah bulan teramai`,
    detail: `${name} memuat ${peak.orders} dari ${totalOrders} order (${percent(share)}).`,
    recommendation: `Siapkan stok dan kampanye sebelum kuartal ${Math.ceil(peak.month / 3)}.`,
    metric: { value: share, unit: 'percent' },
    link: '/produk',
  };
};

export const ytdGrowth: Rule = ({ ytd }) => {
  if (!ytd || ytd.growthPct === null) return null;
  const up = ytd.growthPct >= 0;
  const range = ytd.throughMonth === 1 ? monthName(1, 'short') : `${monthName(1, 'short')}–${monthName(ytd.throughMonth, 'short')}`;
  return {
    id: 'ytd-growth',
    severity: up ? 'positive' : 'warning',
    title: `Penjualan ${ytd.year} ${up ? 'tumbuh' : 'turun'}`,
    detail: `Penjualan ${range} ${ytd.year} ${up ? 'naik' : 'turun'} ${percent(ytd.growthPct)} dibanding ${range} ${ytd.year - 1}.`,
    recommendation: up
      ? 'Pelajari strategi yang mendorong kenaikan dan pertahankan.'
      : 'Cari penyebab penurunan per pasar dan product line, lalu perbaiki strategi.',
    metric: { value: ytd.growthPct, unit: 'percent' },
    link: '/pertumbuhan',
  };
};

export const unsoldProducts: Rule = ({ products }) => {
  const unsold = products.filter((p) => p.sales === 0);
  if (unsold.length === 0) return null;
  const names = unsold.slice(0, 3).map((p) => p.productName).join(', ') + (unsold.length > 3 ? ', …' : '');
  return {
    id: 'unsold-products',
    severity: 'warning',
    title: 'Ada produk yang tidak pernah terjual',
    detail: `${unsold.length} produk tidak pernah terjual: ${names}.`,
    recommendation: 'Kumpulkan umpan balik pasar; putuskan apakah produk dipertahankan.',
    metric: { value: unsold.length, unit: 'count' },
    link: '/produk',
  };
};

export const lowStockTopSellers: Rule = ({ products }, threshold) => {
  const low = products
    .slice(0, 10)
    .map((p, i) => ({ ...p, rank: i + 1 }))
    .filter((p) => p.sales > 0 && p.quantityInStock < threshold);
  if (low.length === 0) return null;
  const list = low
    .map((p) => `${p.productName} (top ${p.rank <= 5 ? 5 : 10} penjualan) tersisa ${p.quantityInStock} unit`)
    .join('; ');
  return {
    id: 'low-stock-top-sellers',
    severity: 'warning',
    title: 'Stok produk terlaris menipis',
    detail: `${list}.`,
    recommendation: 'Pastikan produk terlaris selalu tersedia.',
    metric: { value: low.length, unit: 'count' },
    link: '/produk',
  };
};

export const prospects: Rule = ({ prospects: n }) => {
  if (n === 0) return null;
  return {
    id: 'prospects',
    severity: 'warning',
    title: 'Ada customer yang belum pernah order',
    detail: `${n} customer terdaftar belum pernah order.`,
    recommendation: 'Tindak lanjuti prospek dan tetapkan sales rep.',
    metric: { value: n, unit: 'count' },
    link: '/pelanggan',
  };
};

export const ordersOnHold: Rule = ({ onHold }) => {
  if (onHold.orders === 0) return null;
  const creditLimit = onHold.comments.length > 0 && onHold.comments.every((c) => c && /credit limit/i.test(c));
  return {
    id: 'orders-on-hold',
    severity: 'warning',
    title: 'Ada order yang tertahan',
    detail: `${onHold.orders} order senilai ${num(onHold.sales)} tertahan${creditLimit ? ' karena credit limit terlampaui' : ''}.`,
    recommendation: 'Hubungi customer dan selesaikan pembayaran agar order bisa dikirim.',
    metric: { value: onHold.sales, unit: 'currency' },
    link: '/operasional',
  };
};

const RULES: Rule[] = [
  topProductLine, topMarket, customerConcentration, seasonality, ytdGrowth,
  unsoldProducts, lowStockTopSellers, prospects, ordersOnHold,
];

const ORDER: Record<Severity, number> = { warning: 0, positive: 1, info: 2 };

/** Semua insight yang syaratnya terpenuhi: warning, lalu positive, lalu info. */
export function buildInsights(input: InsightInput, lowStockThreshold = LOW_STOCK_THRESHOLD): Insight[] {
  return RULES.map((rule) => rule(input, lowStockThreshold))
    .filter((i): i is Insight => i !== null)
    .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
