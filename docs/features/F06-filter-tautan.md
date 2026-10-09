# F06 — Filter Global dan Tautan Berbagi (BE: endpoint pilihan filter)

| | |
|---|---|
| Prioritas | P0 |
| Repo / branch | BE · `feat/f06-filter-tautan` |
| Pasangan FE | `feat/f06-filter-tautan` di repo FE (komponen filter, parsing URL, tautan berbagi) |
| Bergantung pada | BE F00 |
| Dipakai oleh | FE F06, lalu F01–F05 (lewat FE) |
| Status | 🟨 Sedang dikerjakan |

## Tujuan

Memberi satu cara memfilter yang konsisten di semua halaman, dan membuat setiap tampilan bisa dibagikan sebagai tautan. Ini menggantikan slicer Power BI. Sisi BE menyediakan daftar pilihan filter yang valid dari satu sumber, sehingga FE tidak menulis ulang daftar tahun, negara, benua, product line, dan status.

## Cakupan Branch Ini

Hanya endpoint `GET /api/v1/dashboard/filters`. Perilaku UI (query string, chip, reset, aria-live, interaksi silang) ada di FE.

## Filter per Halaman (acuan validasi)

Tabel ini menentukan parameter yang diterima tiap endpoint; DTO tiap endpoint mengikutinya.

| Parameter URL | Nilai | F01 | F02 | F03 | F04 | F05 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `year` | 2003–2005 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `month` | 1–12 | ✓ | ✓ | | | |
| `continent` | 5 benua | ✓ | | | ✓ | |
| `country` | 27 negara | ✓ | | | ✓ | |
| `productLine` (boleh berulang) | 7 product line | | ✓ | | | |
| `status` | 6 status | | | | | ✓ |

## Kontrak API

`GET /api/v1/dashboard/filters` (tanpa parameter, di-cache seperti endpoint lain)

```json
{
  "dataRange": { "from": "2003-01-06", "to": "2005-05-31" },
  "years": [2003, 2004, 2005],
  "continents": ["Africa", "Asia", "Europe", "North America", "Oceania"],
  "countries": [{ "country": "Australia", "continent": "Oceania" }],
  "productLines": ["Classic Cars", "Motorcycles", "Planes", "Ships", "Trains", "Trucks and Buses", "Vintage Cars"],
  "statuses": ["Cancelled", "Disputed", "In Process", "On Hold", "Resolved", "Shipped"]
}
```

`years`, `countries`, `productLines`, dan `statuses` diambil dari DB; nama bulan dibuat di FE (`Intl.DateTimeFormat('id-ID')`).

## Langkah Pengerjaan

- [ ] 1. Buat branch `feat/f06-filter-tautan` dari `main` terbaru (setelah F00 BE ter-merge); ubah status F06 di `docs/PRD.md` §7 menjadi 🟨.
- [x] 2. `src/modules/filters/filters.dto.ts`: skema `z.object({}).strict()` (tanpa parameter; parameter apa pun → 422).
- [x] 3. `filters.service.ts`, query paralel (`Promise.all`): rentang `MIN/MAX(orderDate)` → `dataRange`; tahun berbeda dari `orderDate` → `years`; negara berbeda `TRIM(country)` dari `customers`; nama product line; status order berbeda. Semuanya diurutkan.
- [x] 4. Petakan tiap negara ke benua lewat `continents.ts`; `continents` berasal dari enum benua yang sama.
- [x] 5. Bungkus loader dengan `createTtlCache` (key tetap karena tanpa parameter).
- [x] 6. `filters.controller.ts` (dibungkus `asyncHandler`, header `Cache-Control: public, max-age=300`) dan `filters.routes.ts` (hanya `GET`); daftarkan `api.use('/dashboard/filters', filtersRoutes)` di `src/app.ts`.
- [x] 7. Pastikan DB kosong → 200 dengan array kosong dan `dataRange` berisi `null`.
- [x] 8. Unit test DTO dan transformasi data; asersi angka emas ke harness F00.
- [x] 9. Dokumentasikan perubahan kontrak (bila ada) di dokumen ini dan samakan dengan salinan di repo FE.
- [x] 10. `npm run lint`, `npm test`, `npm run build` hijau.
- [x] 11. Commit terakhir: status F06 di PRD §7 menjadi 🟩, isi kolom PR; buka PR ke `main`.

## Kriteria Penerimaan

Kriteria di bawah diturunkan dari kontrak dan angka PRD (dokumen asli hanya memuat kriteria perilaku FE).

- [x] `dataRange` = 2003-01-06 s.d. 2005-05-31; `years` = [2003, 2004, 2005].
- [x] `continents` = 5 benua; `countries` = 27 negara, tiap entri punya benua, dan "Norway" muncul sekali tanpa spasi di belakang.
- [x] `productLines` = 7 item; `statuses` = 6 item (Cancelled, Disputed, In Process, On Hold, Resolved, Shipped).
- [x] Parameter apa pun pada request → 422.
- [x] Respons memiliki header `Cache-Control: public, max-age=300`; request kedua dilayani dari cache.
- [x] DB kosong → 200.
- [ ] Nilai `country`/`continent` di respons diterima apa adanya oleh DTO F01 dan F04 (tes lintas-modul), begitu pula `productLine` oleh F02 dan `status` oleh F05.

## Definisi Selesai

Langkah dan kriteria tercentang, CI hijau, status di PRD §7 = 🟩. FE F06 dapat mulai memakai endpoint ini.
