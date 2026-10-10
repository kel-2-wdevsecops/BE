// Minimasi data (PRD §9): kunci yang tidak boleh ada di respons mana pun.
// Tiap fitur memeriksa respons endpoint-nya dengan `forbiddenKeys(data)`.
const FORBIDDEN = [
  /^phone$/i, /^addressLine/i, /^postalCode$/i, /^email$/i, /^extension$/i,
  /^contactFirstName$/i, /^contactLastName$/i, /^checkNumber$/i, /^creditLimit$/i,
];

/** Path setiap kunci terlarang di `value` (rekursif); kosong = lolos. */
export function forbiddenKeys(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => forbiddenKeys(v, `${path}[${i}]`));
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, v]) => [
    ...(FORBIDDEN.some((re) => re.test(key)) ? [`${path}.${key}`] : []),
    ...forbiddenKeys(v, `${path}.${key}`),
  ]);
}
