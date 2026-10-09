/**
 * Key cache yang stabil untuk filter yang sudah lolos DTO: urutan key, urutan
 * dan duplikat nilai array, serta nilai kosong tidak memengaruhi hasil. Dua URL
 * dengan filter yang sama (`?productLine=B&productLine=A` dan
 * `?productLine=A&productLine=B&productLine=A`) memakai entri cache yang sama.
 */
export function cacheKey(filter: object): string {
  const entries = Object.entries(filter)
    .map(([key, value]) => [key, Array.isArray(value) ? [...new Set(value)].sort() : value] as const)
    .filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0))
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}
