import { z } from 'zod';

// Tanpa filter: insight dihitung atas seluruh data.
export const InsightsQuery = z.object({}).strict();
