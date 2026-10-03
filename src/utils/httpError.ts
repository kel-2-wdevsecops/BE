/**
 * Error dengan status HTTP, dilempar dari service dan diterjemahkan
 * errorMiddleware. `field` (opsional) dikirim sebagai `errors[field]`, supaya
 * FE bisa menandai input yang salah.
 */
export function httpError(statusCode: number, message: string, field?: string) {
  return Object.assign(new Error(message), { statusCode, ...(field && { field }) });
}

export const notFound = (entity: string) => httpError(404, `${entity} not found.`);
