// Dump classicmodels tidak punya kolom benua. Peta ini mengikuti kolom
// `Continent` di Power BI Axon (PRD §6), termasuk Russia dan Israel di Asia
// (pertanyaan terbuka Q2). Isinya 27 negara di tabel `customers`; negara baru
// harus ditambahkan di sini, karena DTO hanya menerima negara yang ada di peta.

export const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania'] as const;
export type Continent = (typeof CONTINENTS)[number];

const COUNTRY_CONTINENT = {
  'South Africa': 'Africa',

  'Hong Kong':  'Asia',
  Israel:       'Asia',
  Japan:        'Asia',
  Philippines:  'Asia',
  Russia:       'Asia',
  Singapore:    'Asia',

  Austria:     'Europe',
  Belgium:     'Europe',
  Denmark:     'Europe',
  Finland:     'Europe',
  France:      'Europe',
  Germany:     'Europe',
  Ireland:     'Europe',
  Italy:       'Europe',
  Netherlands: 'Europe',
  Norway:      'Europe',
  Poland:      'Europe',
  Portugal:    'Europe',
  Spain:       'Europe',
  Sweden:      'Europe',
  Switzerland: 'Europe',
  UK:          'Europe',

  Canada: 'North America',
  USA:    'North America',

  Australia:     'Oceania',
  'New Zealand': 'Oceania',
} as const satisfies Record<string, Continent>;

export type Country = keyof typeof COUNTRY_CONTINENT;

export const COUNTRIES = Object.keys(COUNTRY_CONTINENT).sort() as [Country, ...Country[]];

/** Benua sebuah negara. Nama di-trim: dump berisi "Norway  " (spasi di belakang). */
export function continentOf(country: string): Continent | null {
  return (COUNTRY_CONTINENT as Record<string, Continent>)[country.trim()] ?? null;
}

export function countriesIn(continent: Continent): Country[] {
  return COUNTRIES.filter((country) => COUNTRY_CONTINENT[country] === continent);
}

/** Pilihan filter negara: nama dari DB di-trim, di-dedup, diurutkan, beserta benuanya. */
export function countryOptions(names: string[]): { country: string; continent: Continent }[] {
  return [...new Set(names.map((n) => n.trim()))]
    .sort()
    .flatMap((country) => {
      const continent = continentOf(country);
      // Negara di luar peta tidak ditawarkan: DTO akan menolaknya (422).
      return continent ? [{ country, continent }] : [];
    });
}
