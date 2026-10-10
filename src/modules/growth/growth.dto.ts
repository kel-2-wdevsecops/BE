import { z } from 'zod';
import { year } from '../../lib/querySchemas';

// `year` hanya memilih baris yang ditampilkan; deretnya dihitung dari seluruh data.
export const GrowthQuery = z.object({ year }).strict();

export type GrowthFilter = z.infer<typeof GrowthQuery>;
