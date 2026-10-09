import { z } from 'zod';
import { status, year } from '../../lib/querySchemas';

// `status` hanya memengaruhi statusBreakdown dan attentionOrders.
export const OperationsQuery = z.object({ year, status }).strict();

export type OperationsFilter = z.infer<typeof OperationsQuery>;
