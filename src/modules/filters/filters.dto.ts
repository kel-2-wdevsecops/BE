import { z } from 'zod';

// Tanpa parameter: parameter apa pun ditolak 422.
export const FiltersQuery = z.object({}).strict();
