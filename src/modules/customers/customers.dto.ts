import { z } from 'zod';
import { continent, country, year } from '../../lib/querySchemas';

export const CustomersQuery = z.object({ year, continent, country }).strict();

export type CustomersFilter = z.infer<typeof CustomersQuery>;
