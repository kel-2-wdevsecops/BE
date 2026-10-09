import { z } from 'zod';
import { month, productLine, year } from '../../lib/querySchemas';

// `?productLine=A&productLine=B` = pilihan ganda (slicer Product Line).
export const ProductsQuery = z.object({ productLine, year, month }).strict();

export type ProductsFilter = z.infer<typeof ProductsQuery>;
