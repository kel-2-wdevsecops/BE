# F03 — Analisis Pertumbuhan (BE)

| | |
|---|---|
| Prioritas | P0 |
| Repo / branch | BE · `feat/f03-pertumbuhan` |
| Pasangan FE | `feat/f03-pertumbuhan` di repo FE (halaman `/pertumbuhan`) |
| Endpoint | `GET /api/v1/dashboard/growth` |
| Padanan Power BI | Halaman **Sales** |
| Bergantung pada | BE F00 |
| Status | ⬜ Belum mulai |

## Tujuan

Membantu manajemen menilai apakah penjualan tumbuh dengan membandingkan setiap periode dengan periode kalender sebelumnya: tahun ke tahun (YoY), kuartal ke kuartal (QoQ), dan bulan ke bulan (MoM).

## User Stories

- Sebagai eksekutif, saya ingin melihat pertumbuhan penjualan tahunan agar tahu apakah strategi tahun ini lebih berhasil.
- Sebagai manajer sales, saya ingin melihat perubahan per kuartal dan per bulan agar bisa mendeteksi penurunan lebih awal.
- Sebagai eksekutif, saya ingin perbandingan yang adil untuk tahun berjalan (2005 baru sampai Mei) agar tidak salah menyimpulkan penjualan anjlok.

## Kontrak API (sumber kebenaran)

`GET /api/v1/dashboard/growth?year=`

```json
{
  "dataRange": { "from": "2003-01-06", "to": "2005-05-31" },
  "ytd": { "year": 2005, "throughMonth": 5, "sales": 1770936.71, "previous": 1235480.38, "growthPct": 43.34 },
  "yearly": [{ "year": 2004, "sales": 4515905.51, "previous": 3317348.39, "growthPct": 36.13, "isPartial": false }],
  "quarterly": [{ "year": 2004, "quarter": 1, "sales": 799579.31, "previous": 1779084.61, "growthPct": -55.06, "isPartial": false }],
  "monthly": [{ "year": 2004, "month": 1, "sales": 292385.21, "previous": 276723.25, "growthPct": 5.66, "isPartial": false }],
  "salesProfitByYear": [{ "year": 2004, "sales": 4515905.51, "profit": 1809381.14 }]
}
```

## Aturan Bisnis

- Deret dihitung dari seluruh data, lalu filter `year` hanya memilih baris yang ditampilkan. Dengan `year=2004`, baris Januari 2004 tetap dibandingkan dengan Desember 2003.
- Periode sebelumnya = periode kalender tepat sebelumnya, bukan baris sebelumnya di hasil query (bulan tanpa order tetap dihitung sebagai bulan dengan penjualan 0).
- `growthPct = (sales − previous) / previous × 100`, dibulatkan 2 desimal; `null` bila `previous` tidak ada (sebelum Januari 2003) atau 0. Ini menggantikan "Infinity" di Power BI.
- `isPartial = true` bila periode berakhir setelah `dataRange.to` (tahun 2005, Q2 2005).
- `ytd` membandingkan Januari s.d. bulan order terakhir pada tahun terakhir dengan rentang bulan yang sama pada tahun sebelumnya. Tidak terpengaruh filter.
- Logika growth, periode sebelumnya, dan parsial ada di `src/lib/growth.ts` (fungsi murni, ber-test). SQL hanya mengembalikan penjualan per bulan; kuartal dan tahun diturunkan di kode agar satu sumber.

## Langkah Pengerjaan

- [ ] 1. Buat branch `feat/f03-pertumbuhan` dari `main` terbaru (F00 BE sudah ter-merge); ubah status F03 di `docs/PRD.md` §7 menjadi 🟨.
- [ ] 2. `src/lib/growth.ts`: `growthPct()` (2 desimal, `null` bila pembanding tidak ada atau 0), `previousPeriod()` (bulan/kuartal/tahun kalender sebelumnya, termasuk pergantian tahun), `isPartial()` (periode berakhir setelah `dataRange.to`).
- [ ] 3. `src/lib/growth.test.ts`: pergantian tahun (Januari vs Desember), pembanding 0, periode tanpa pembanding, periode parsial.
- [ ] 4. `src/modules/growth/growth.dto.ts`: skema strict dengan `year` saja.
- [ ] 5. `growth.service.ts`: satu query penjualan per bulan atas seluruh data (bulan tanpa order diisi 0 di kode), query profit dan penjualan per tahun untuk `salesProfitByYear`, `dataRange` dari `MIN/MAX(orderDate)`.
- [ ] 6. Turunkan `monthly`, `quarterly`, `yearly` dari deret bulanan di kode; hitung `ytd` (Januari s.d. bulan order terakhir vs rentang yang sama tahun sebelumnya, tidak terpengaruh filter).
- [ ] 7. Terapkan filter `year` hanya pada baris yang ditampilkan (deret tetap dihitung dari seluruh data).
- [ ] 8. Bungkus dengan `createTtlCache` dan `cacheKey`; tipe respons eksplisit.
- [ ] 9. `growth.controller.ts`, `growth.routes.ts`; daftarkan `api.use('/dashboard/growth', growthRoutes)` di `src/app.ts`.
- [ ] 10. Pastikan DB kosong → 200 (array kosong, `ytd` aman, tanpa `NaN`/`Infinity`).
- [ ] 11. Asersi angka emas ke harness; tes kontrak kunci terlarang.
- [ ] 12. `npm run lint`, `npm test`, `npm run build` hijau.
- [ ] 13. Commit terakhir: status F03 di PRD §7 menjadi 🟩, isi kolom PR; buka PR ke `main`.

## Kriteria Penerimaan

- [ ] YoY: 2003 growth `null`; 2004 +36,13 %; 2005 −60,78 % dengan `isPartial: true`.
- [ ] QoQ: Q4 2003 +188,39 %; Q1 2004 −55,06 %.
- [ ] MoM: Januari 2003 `null`; Desember 2003 −71,99 %; Januari 2004 +5,66 %.
- [ ] YTD: 1.770.936,71 vs 1.235.480,38 = +43,34 %.
- [ ] `year=2004` mengembalikan 1 baris YoY, 4 baris QoQ, 12 baris MoM; Januari 2004 tetap punya pembanding.
- [ ] Tidak ada `Infinity` atau `NaN` di respons.
- [ ] Unit test `growth.ts` mencakup pergantian tahun, pembanding 0, dan periode parsial.

Kriteria tampilan (label "parsial", ikon naik/turun, "—" untuk `null`) ada di dokumen FE.

## Definisi Selesai

Langkah dan kriteria tercentang, CI hijau, status di PRD §7 = 🟩. FE F03 dapat memakai endpoint ini; F07 dapat memakai `ytd`.
