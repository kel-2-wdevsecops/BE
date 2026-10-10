# F07 — Sorotan Insight dan Rekomendasi (BE)

| | |
|---|---|
| Prioritas | P1 |
| Repo / branch | BE · `feat/f07-sorotan-insight` |
| Pasangan FE | `feat/f07-sorotan-insight` di repo FE (panel "Sorotan" di `/`) |
| Endpoint | `GET /api/v1/dashboard/insights` |
| Padanan | Slide Suggestions, Insight's, dan Recommendation di PPTX |
| Bergantung pada | BE F00; sebaiknya setelah F01–F05 BE ter-merge karena aturan memakai agregat dari modul-modul itu (lihat asumsi) |
| Status | 🟩 Selesai (belum dirilis) |

## Tujuan

Mengubah angka menjadi kalimat yang bisa langsung ditindaklanjuti. Ini menjawab langsung tujuan proyek: dashboard tidak hanya menampilkan data, tetapi menunjukkan apa yang perlu diputuskan. Insight PPTX ditulis manual sekali; di sini insight dihitung ulang dari data setiap kali cache diperbarui.

## User Stories

- Sebagai eksekutif dengan waktu terbatas, saya ingin membaca 5–9 poin penting tanpa harus menafsirkan grafik.
- Sebagai manajer, saya ingin setiap poin disertai rekomendasi dan tautan ke halaman detailnya.

## Aturan Insight

Setiap aturan adalah fungsi murni di `src/lib/insights.ts` (BE) yang menerima agregat dan mengembalikan satu insight atau `null` bila syaratnya tidak terpenuhi. Teks memakai template; angka selalu dari data. Ambang adalah konstanta yang bisa diubah.

| ID | Syarat | Contoh hasil dari data saat ini | Rekomendasi (dari PPTX) | Tautan |
|---|---|---|---|---|
| `top-product-line` | selalu | Classic Cars menyumbang 40,13 % penjualan | Perluas lini Classic Cars dan Vintage Cars; evaluasi lini dengan penjualan rendah | `/produk` |
| `top-market` | selalu | USA menyumbang 34,08 % penjualan | Perkuat pasar USA; jadikan Eropa (Spain, France, Germany) pijakan ekspansi | `/` |
| `customer-concentration` | porsi 2 customer teratas ≥ 10 % | Euro+ Shopping Channel dan Mini Gifts Distributors Ltd. menyumbang 14,71 % penjualan | Jaga hubungan dengan customer utama dan kurangi ketergantungan | `/pelanggan` |
| `seasonality` | bulan dengan order terbanyak ≥ 1,5 × rata-rata bulanan | November memuat 63 dari 326 order (19,33 %) | Siapkan stok dan kampanye sebelum kuartal 4 | `/produk` |
| `ytd-growth` | selalu | Penjualan Jan–Mei 2005 naik 43,34 % dibanding Jan–Mei 2004 | Pelajari strategi yang mendorong kenaikan dan pertahankan | `/pertumbuhan` |
| `unsold-products` | ada produk tanpa penjualan | 1 produk tidak pernah terjual: 1985 Toyota Supra | Kumpulkan umpan balik pasar; putuskan apakah produk dipertahankan | `/produk` |
| `low-stock-top-sellers` | ada produk top 10 penjualan dengan stok < `LOW_STOCK_THRESHOLD` (100) | 1968 Ford Mustang (top 5 penjualan) tersisa 68 unit | Pastikan produk terlaris selalu tersedia | `/produk` |
| `prospects` | ada customer tanpa order | 24 customer terdaftar belum pernah order | Tindak lanjuti prospek dan tetapkan sales rep | `/pelanggan` |
| `orders-on-hold` | ada order On Hold | 4 order senilai 169.575,61 tertahan karena credit limit terlampaui | Hubungi customer dan selesaikan pembayaran agar order bisa dikirim | `/operasional` |

## Kontrak API (sumber kebenaran)

`GET /api/v1/dashboard/insights` (tanpa filter; dihitung atas seluruh data)

```json
[
  {
    "id": "top-product-line",
    "severity": "info",
    "title": "Classic Cars adalah lini terbesar",
    "detail": "Classic Cars menyumbang 40,13 % penjualan (3.853.922,49 dari 9.604.190,61).",
    "recommendation": "Perluas lini Classic Cars dan Vintage Cars; evaluasi lini dengan penjualan rendah.",
    "metric": { "value": 40.13, "unit": "percent" },
    "link": "/produk"
  }
]
```

- `severity`: `positive` (tren baik), `info` (fakta struktural), `warning` (perlu tindakan). Urutan respons: `warning`, lalu `positive`, lalu `info`.
- Teks dihasilkan di BE dalam bahasa Indonesia dengan format angka `id-ID`, agar FE cukup merender.
- `link` hanya boleh salah satu route internal yang dikenal (whitelist), tidak pernah URL eksternal.

## Langkah Pengerjaan

Asumsi penempatan: sumber agregat tiap aturan memakai ulang loader berdaftar cache dari service F01–F05 bila ada (mis. penjualan per product line dari F02, pelanggan dan prospek dari F04, On Hold dari F05, YTD dari F03), agar angka insight pasti sama dengan halaman detailnya. Karena itu branch ini sebaiknya dibuat setelah F01–F05 BE ter-merge.

- [ ] 1. Buat branch `feat/f07-sorotan-insight` dari `main` terbaru; ubah status F07 di `docs/PRD.md` §7 menjadi 🟨.
- [x] 2. Konstanta ambang (mis. porsi konsentrasi 10 %, rasio musiman 1,5, `LOW_STOCK_THRESHOLD` dari F02) di satu tempat yang bisa diubah.
- [x] 3. `src/lib/insights.ts`: satu fungsi murni per aturan (9 aturan di tabel), tiap fungsi menerima agregat dan mengembalikan satu insight atau `null`; template teks `id-ID`, angka dari data; `link` dibatasi whitelist route internal.
- [x] 4. `src/lib/insights.test.ts`: tiap aturan diuji untuk kondisi terpenuhi, tidak terpenuhi, dan input kosong.
- [x] 5. `src/modules/insights/insights.dto.ts`: skema `z.object({}).strict()` (tanpa parameter).
- [x] 6. `insights.service.ts`: kumpulkan agregat secara paralel, jalankan semua aturan, buang `null`, urutkan `warning` → `positive` → `info`.
- [x] 7. Bungkus dengan `createTtlCache`; tipe respons eksplisit (`id`, `severity`, `title`, `detail`, `recommendation`, `metric`, `link`).
- [x] 8. `insights.controller.ts`, `insights.routes.ts`; daftarkan `api.use('/dashboard/insights', insightsRoutes)` di `src/app.ts`.
- [x] 9. Pastikan DB kosong → 200 dengan array kosong (bukan error).
- [x] 10. Asersi angka emas (9 insight) ke harness; tes bahwa mengubah `LOW_STOCK_THRESHOLD` menjadi 50 menghilangkan `low-stock-top-sellers`.
- [x] 11. `npm run lint`, `npm test`, `npm run build` hijau.
- [ ] 12. Commit terakhir: status F07 di PRD §7 menjadi 🟩, isi kolom PR; buka PR ke `main`.

## Kriteria Penerimaan

- [x] Dengan data dump, respons berisi 9 insight dengan angka sesuai kolom "Contoh hasil".
- [x] Pada DB kosong, respons adalah array kosong (bukan error).
- [x] Unit test setiap aturan: kondisi terpenuhi, tidak terpenuhi, dan input kosong.
- [x] Mengubah `LOW_STOCK_THRESHOLD` menjadi 50 menghilangkan insight `low-stock-top-sellers`.
- [x] Semua `link` adalah salah satu dari `/`, `/produk`, `/pertumbuhan`, `/pelanggan`, `/operasional`.

Kriteria tampilan (panel "Sorotan", pesan "Belum ada insight", ikon severity) ada di dokumen FE.

## Definisi Selesai

Langkah dan kriteria tercentang, CI hijau, status di PRD §7 = 🟩. FE F07 dapat memakai endpoint ini.
