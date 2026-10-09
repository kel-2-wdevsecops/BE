# F01 — Ringkasan Penjualan (BE)

| | |
|---|---|
| Prioritas | P0 |
| Repo / branch | BE · `feat/f01-ringkasan` |
| Pasangan FE | `feat/f01-ringkasan` di repo FE (halaman `/`) |
| Endpoint | `GET /api/v1/dashboard/overview` |
| Padanan Power BI | Halaman **Home** |
| Bergantung pada | BE F00 (dan F06 BE bila `continent`/`country` diuji lintas-modul) |
| Status | 🟩 Selesai (belum dirilis) |

## Tujuan

Memberi manajemen gambaran kinerja dalam satu layar: berapa omzet dan profit, berapa pelanggan, dari pasar mana penjualan datang, dan bagaimana trennya per tahun. Sisi BE menghitung semua angka itu dengan definisi PRD §6.

## User Stories

- Sebagai eksekutif, saya ingin melihat total penjualan, profit, dan margin agar tahu kesehatan bisnis saat ini.
- Sebagai manajer regional, saya ingin memfilter per benua dan negara agar bisa menilai pasar saya sendiri.
- Sebagai eksekutif, saya ingin melihat 5 negara dengan penjualan terbesar agar tahu pasar mana yang perlu dijaga.

## Kontrak API (sumber kebenaran)

`GET /api/v1/dashboard/overview?year=&month=&continent=&country=`

Semua parameter opsional. `month` tanpa `year` berarti bulan itu di semua tahun.

```json
{
  "kpi": {
    "sales": 9604190.61,
    "profit": 3825880.25,
    "profitMarginPct": 39.84,
    "orders": 326,
    "customers": 122,
    "activeCustomers": 98,
    "employees": 23
  },
  "topCountriesBySales": [{ "country": "USA", "sales": 3273280.05 }],
  "customersByContinent": [{ "continent": "Europe", "customers": 64 }],
  "customersByCountry": [{ "country": "USA", "continent": "North America", "customers": 36 }],
  "salesByYear": [{ "year": 2003, "sales": 3317348.39, "profit": 1320622.94, "isPartial": false }]
}
```

## Aturan Bisnis

- Filter waktu (`year`, `month`) memengaruhi: `sales`, `profit`, `profitMarginPct`, `orders`, `activeCustomers`, `topCountriesBySales`, `salesByYear`.
- Filter geografi (`continent`, `country`) memengaruhi semua metrik kecuali `employees`.
- `customers`, `customersByContinent`, `customersByCountry` menghitung customer terdaftar dan tidak terpengaruh filter waktu (sama dengan Power BI). Label UI: "Customer terdaftar".
- `employees` selalu jumlah seluruh karyawan (23), sama dengan Power BI, karena karyawan tidak terikat ke negara customer.
- `customersByCountry` dikirim lengkap (maksimal 27 baris); pengelompokan "Lainnya" dilakukan FE.
- Negara di-`TRIM`, benua dari `continents.ts`.

## Langkah Pengerjaan

- [ ] 1. Buat branch `feat/f01-ringkasan` dari `main` terbaru (F00 BE sudah ter-merge); ubah status F01 di `docs/PRD.md` §7 menjadi 🟨.
- [x] 2. `src/modules/overview/overview.dto.ts`: skema strict `year`, `month`, `continent`, `country` memakai skema bersama F00.
- [x] 3. `overview.service.ts`, query paralel (`Promise.all`) dengan WHERE dari `sqlFilters.ts`:
  - KPI waktu+geografi: `sales`, `profit`, `orders`, `activeCustomers`; `profitMarginPct` dihitung aman nol.
  - `customers` (terdaftar, hanya filter geografi) dan `employees` (total, tanpa filter).
  - `topCountriesBySales` (5 teratas), `customersByContinent` (via `continents.ts`), `customersByCountry` (maksimal 27 baris, membawa `continent`).
  - `salesByYear` dengan `isPartial` (tahun 2005).
- [x] 4. Terapkan aturan: `month` tanpa `year` = bulan itu di semua tahun; semua `TRIM(country)`.
- [x] 5. Bungkus dengan `createTtlCache` dan `cacheKey(filter)`; definisikan tipe respons eksplisit (bukan objek Prisma mentah).
- [x] 6. `overview.controller.ts` (dibungkus `asyncHandler`, header `Cache-Control`), `overview.routes.ts` (hanya `GET`); daftarkan `api.use('/dashboard/overview', overviewRoutes)` di `src/app.ts`.
- [x] 7. Pastikan DB kosong → 200 dengan nilai nol/array kosong.
- [x] 8. Unit test DTO; asersi angka emas (semua kriteria di bawah) ke harness `npm run test:golden`; tes kontrak kunci terlarang.
- [x] 9. Bukti kriteria F00 pada endpoint nyata: `?foo=1` → 422, `?year=abc`/`?month=13`/`?continent=Mars` → 422, header `Cache-Control` ada.
- [x] 10. `npm run lint`, `npm test`, `npm run build` hijau.
- [x] 11. Commit terakhir: status F01 di PRD §7 menjadi 🟩, isi kolom PR; buka PR ke `main`.

## Kriteria Penerimaan

- [x] Tanpa filter: penjualan 9.604.190,61; profit 3.825.880,25; margin 39,84 %; 326 order; 122 customer; 98 customer aktif; 23 karyawan.
- [x] Customer per benua: Europe 64, North America 39, Asia 9, Oceania 9, Africa 1.
- [x] Top 5 negara: USA 3.273.280,05; Spain 1.099.389,09; France 1.007.374,02; Australia 562.582,59; New Zealand 476.847,01.
- [x] Penjualan per tahun: 2003 3.317.348,39; 2004 4.515.905,51; 2005 1.770.936,71 (`isPartial: true`).
- [x] `year=2004`: penjualan 4.515.905,51; profit 1.809.381,14; 151 order.
- [x] Norway tampil sebagai satu negara dengan 3 customer.
- [x] Parameter tak dikenal atau nilai di luar enum → 422; DB kosong → 200.

Kriteria tampilan (klik bar, responsif mobile) ada di dokumen FE.

## Definisi Selesai

Langkah dan kriteria tercentang, CI hijau, status di PRD §7 = 🟩. FE F01 dapat memakai endpoint ini.
