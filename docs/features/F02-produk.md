# F02 — Analisis Produk (BE)

| | |
|---|---|
| Prioritas | P0 |
| Repo / branch | BE · `feat/f02-produk` |
| Pasangan FE | `feat/f02-produk` di repo FE (halaman `/produk`) |
| Endpoint | `GET /api/v1/dashboard/products` |
| Padanan Power BI | Halaman **Products** |
| Bergantung pada | BE F00 |
| Status | ⬜ Belum mulai |

## Tujuan

Membantu tim marketing dan produk melihat product line, produk, dan vendor mana yang menghasilkan penjualan, kapan order ramai, dan produk laris mana yang stoknya menipis.

## User Stories

- Sebagai tim produk, saya ingin membandingkan penjualan dan profit per product line agar tahu lini mana yang perlu dikembangkan.
- Sebagai tim marketing, saya ingin melihat produk terlaris dan produk yang tidak terjual agar bisa mengatur promosi.
- Sebagai tim pengadaan, saya ingin melihat 5 vendor teratas dan stok produk laris agar hubungan vendor dan stok terjaga.
- Sebagai tim marketing, saya ingin melihat jumlah order per bulan agar tahu musim ramai.

## Kontrak API (sumber kebenaran)

`GET /api/v1/dashboard/products?productLine=&productLine=&year=&month=`

Power BI punya slicer tahun/bulan di halaman ini; README BE baru menyebut product line. Tahun/bulan ditambahkan untuk paritas.

```json
{
  "kpi": { "sales": 9604190.61, "profit": 3825880.25, "profitMarginPct": 39.84, "orders": 326, "quantity": 105516 },
  "salesByProductLine": [{ "productLine": "Classic Cars", "sales": 3853922.49, "profit": 1526212.20 }],
  "ordersByYear": [{ "year": 2003, "orders": 111 }],
  "ordersByMonth": [{ "month": 1, "orders": 25 }],
  "topVendors": [{ "vendor": "Classic Metal Creations", "sales": 934554.42 }],
  "products": [{
    "productCode": "S18_3232", "productName": "1992 Ferrari 360 Spider red", "productLine": "Classic Cars",
    "sales": 276839.98, "profit": 135996.78, "quantity": 1808, "orders": 53, "quantityInStock": 8347, "lowStock": false
  }]
}
```

## Aturan Bisnis

- `orders` dan `ordersBy*` = jumlah order berbeda yang memuat minimal satu baris dari product line terpilih. Satu order bisa berisi beberapa product line, jadi jumlah order per product line tidak dijumlahkan menjadi total.
- `ordersByMonth` selalu berisi 12 baris (bulan tanpa order = 0).
- `products` memuat semua produk pada product line terpilih, **termasuk yang tidak pernah terjual** (penjualan 0). Filter waktu hanya memengaruhi angka penjualan, bukan daftar produk.
- `lowStock = quantityInStock < LOW_STOCK_THRESHOLD` (konstanta BE, default 100). Ambang ini asumsi, bukan aturan dari data; perlu disepakati tim.
- `topVendors` maksimal 5 baris.

## Langkah Pengerjaan

- [ ] 1. Buat branch `feat/f02-produk` dari `main` terbaru (F00 BE sudah ter-merge); ubah status F02 di `docs/PRD.md` §7 menjadi 🟨.
- [ ] 2. `src/modules/products/products.dto.ts`: skema strict `productLine` (string atau array), `year`, `month` memakai skema bersama F00.
- [ ] 3. Definisikan `LOW_STOCK_THRESHOLD` (default 100) sekali di berkas konstanta bersama (mis. `src/config/thresholds.ts`) agar bisa di-import F07.
- [ ] 4. `products.service.ts`, query paralel dengan WHERE dari `sqlFilters.ts`:
  - `kpi` (penjualan, profit, margin, order berbeda, kuantitas).
  - `salesByProductLine` (penjualan + profit).
  - `ordersByYear`, `ordersByMonth` (12 baris, bulan kosong = 0, urutan kalender).
  - `topVendors` (5 teratas berdasarkan penjualan).
  - `products`: semua produk pada product line terpilih dengan LEFT JOIN agar yang tak terjual tetap ada (penjualan 0); hitung `lowStock`.
- [ ] 5. Pastikan `productLine` tak dikenal (lolos regex) → 200 dengan nilai nol, bukan error.
- [ ] 6. Bungkus dengan `createTtlCache` dan `cacheKey` (array `productLine` diurutkan dan di-dedup); tipe respons eksplisit.
- [ ] 7. `products.controller.ts`, `products.routes.ts`; daftarkan `api.use('/dashboard/products', productsRoutes)` di `src/app.ts`.
- [ ] 8. Pastikan DB kosong → 200.
- [ ] 9. Unit test DTO (termasuk array, >7 item, karakter terlarang); asersi angka emas ke harness; tes kontrak kunci terlarang.
- [ ] 10. `npm run lint`, `npm test`, `npm run build` hijau.
- [ ] 11. Commit terakhir: status F02 di PRD §7 menjadi 🟩, isi kolom PR; buka PR ke `main`.

## Kriteria Penerimaan

- [ ] Tanpa filter, penjualan per product line: Classic Cars 3.853.922,49; Vintage Cars 1.797.559,63; Motorcycles 1.121.426,12; Trucks and Buses 1.024.113,57; Planes 954.637,54; Ships 663.998,34; Trains 188.532,92.
- [ ] Top 5 vendor: Classic Metal Creations 934.554,42; Unimax Art Galleries 884.167,33; Gearbox Collectibles 828.013,76; Second Gear Diecast 803.892,06; Exoto Designs 793.392,31.
- [ ] Order per tahun: 2003 = 111, 2004 = 151, 2005 = 64.
- [ ] Order per bulan (semua tahun): Jan 25, Feb 26, Mar 27, Apr 29, Mei 29, Jun 19, Jul 18, Agu 17, Sep 20, Okt 31, Nov 63, Des 22.
- [ ] Produk teratas: 1992 Ferrari 360 Spider red, penjualan 276.839,98, 53 order.
- [ ] `products` memuat 110 produk; 1985 Toyota Supra tampil dengan penjualan 0.
- [ ] 1968 Ford Mustang (top 5 penjualan, stok 68) `lowStock: true`.
- [ ] `productLine=Classic Cars&productLine=Vintage Cars`: penjualan = 5.651.482,12.
- [ ] `productLine=Unknown` → 200 dengan nilai nol (lolos regex, tidak ada data).

Kriteria tampilan (tabel bisa diurutkan, pencarian, penanda stok rendah, klik bar) ada di dokumen FE.

## Definisi Selesai

Langkah dan kriteria tercentang, CI hijau, status di PRD §7 = 🟩. FE F02 dapat memakai endpoint ini; F07 dapat memakai `LOW_STOCK_THRESHOLD`.
