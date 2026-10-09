import { z } from 'zod';
import { continent, country, month, year } from '../../lib/querySchemas';

// `month` tanpa `year` = bulan itu di semua tahun.
export const OverviewQuery = z.object({ year, month, continent, country }).strict();

export type OverviewFilter = z.infer<typeof OverviewQuery>;
