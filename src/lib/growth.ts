import { round2 } from './money';

// Pertumbuhan (YoY, QoQ, MoM) terhadap periode kalender tepat sebelumnya
// (Januari 2004 vs Desember 2003), bukan baris sebelumnya di hasil query.
// Periode tanpa pembanding, atau pembanding 0, punya growthPct null; Power BI
// menampilkannya sebagai "Infinity".

export type Grain = 'year' | 'quarter' | 'month';

/** `index`: bulan 1–12, kuartal 1–4, atau 1 untuk tahun. */
export interface Period { year: number; index: number }

const PER_YEAR: Record<Grain, number> = { year: 1, quarter: 4, month: 12 };

export function previousPeriod({ year, index }: Period, grain: Grain): Period {
  return index > 1 ? { year, index: index - 1 } : { year: year - 1, index: PER_YEAR[grain] };
}

/** Tanggal terakhir periode, 'YYYY-MM-DD'. */
export function periodEnd({ year, index }: Period, grain: Grain): string {
  const lastMonth = index * (12 / PER_YEAR[grain]);
  const lastDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate();
  return `${year}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** Periode berakhir setelah data terakhir (`dataTo`), mis. tahun 2005 dan Q2 2005. */
export function isPartial(period: Period, grain: Grain, dataTo: string | null): boolean {
  return dataTo !== null && periodEnd(period, grain) > dataTo;
}

export function growthPct(sales: number, previous: number | null): number | null {
  return previous ? round2(((sales - previous) / previous) * 100) : null;
}

export interface MonthlySales { year: number; month: number; sales: number }

export interface GrowthRow extends Period {
  sales:     number;
  previous:  number | null;
  growthPct: number | null;
  isPartial: boolean;
}

/**
 * Deret per `grain` dari penjualan bulanan. Bulan di antara bulan pertama dan
 * terakhir data yang tidak punya order dihitung 0 (tetap jadi pembanding).
 * `previous` null hanya bila pembandingnya sebelum data dimulai.
 */
export function growthSeries(monthly: MonthlySales[], grain: Grain, dataTo: string | null): GrowthRow[] {
  if (monthly.length === 0) return [];
  const key = (p: Period) => p.year * 100 + p.index;
  const toPeriod = (m: MonthlySales): Period => ({ year: m.year, index: Math.ceil(m.month / (12 / PER_YEAR[grain])) });

  const totals = new Map<number, number>();
  for (const m of monthly) totals.set(key(toPeriod(m)), (totals.get(key(toPeriod(m))) ?? 0) + m.sales);

  const sorted = [...monthly].sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));
  const first = toPeriod(sorted[0]);
  const last = toPeriod(sorted[sorted.length - 1]);

  const rows: GrowthRow[] = [];
  for (let p = first; key(p) <= key(last); p = p.index < PER_YEAR[grain] ? { year: p.year, index: p.index + 1 } : { year: p.year + 1, index: 1 }) {
    const sales = totals.get(key(p)) ?? 0;
    const prev = previousPeriod(p, grain);
    const previous = key(prev) < key(first) ? null : (totals.get(key(prev)) ?? 0);
    rows.push({
      ...p,
      sales:     round2(sales),
      previous:  previous === null ? null : round2(previous),
      growthPct: growthPct(sales, previous),
      isPartial: isPartial(p, grain, dataTo),
    });
  }
  return rows;
}
