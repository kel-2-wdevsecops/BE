# F04 — Pelanggan dan Tim Sales (BE)

| | |
|---|---|
| Prioritas | P1 |
| Repo / branch | BE · `feat/f04-pelanggan-tim-sales` |
| Pasangan FE | `feat/f04-pelanggan-tim-sales` di repo FE (halaman `/pelanggan`) |
| Endpoint | `GET /api/v1/dashboard/customers` |
| Padanan | Insight PPTX (slide 9, 11, 14) dan query `Axon SQL.sql` no. 2, 10, 18, 22, 26. Tidak ada di Power BI |
| Bergantung pada | BE F00 |
| Status | 🟨 Sedang dikerjakan |

## Tujuan

Membantu manajer sales mengenali pelanggan bernilai tinggi, prospek yang belum pernah membeli, dan kinerja sales rep serta kantor, agar hubungan pelanggan utama dijaga dan beban kerja tim seimbang.

## User Stories

- Sebagai manajer sales, saya ingin melihat 10 pelanggan dengan penjualan terbesar agar bisa memprioritaskan hubungan dengan mereka.
- Sebagai manajer sales, saya ingin tahu berapa pelanggan terdaftar yang belum pernah order agar tim bisa menindaklanjuti prospek.
- Sebagai manajer sales, saya ingin membandingkan jumlah pelanggan dan penjualan per sales rep dan per kantor agar bisa memberi apresiasi dan menyeimbangkan beban.
- Sebagai tim keuangan, saya ingin melihat sebaran segmen credit limit pelanggan.

## Kontrak API (sumber kebenaran)

`GET /api/v1/dashboard/customers?year=&continent=&country=`

```json
{
  "kpi": {
    "customers": 122, "activeCustomers": 98, "prospects": 24,
    "withoutSalesRep": 22, "avgOrderValue": 29460.71
  },
  "topCustomers": [{ "customerNumber": 141, "customerName": "Euro+ Shopping Channel", "country": "Spain", "sales": 820689.54, "orders": 26, "sharePct": 8.55 }],
  "salesReps": [{ "employeeNumber": 1370, "name": "Gerard Hernandez", "office": "Paris", "customers": 7, "orders": 43, "sales": 1258577.81 }],
  "offices": [{ "officeCode": "4", "city": "Paris", "country": "France", "territory": "EMEA", "customers": 29, "sales": 3083761.58 }],
  "creditSegments": [
    { "segment": "none", "label": "Tanpa limit (0)", "customers": 24 },
    { "segment": "low", "label": "< 10.000", "customers": 0 },
    { "segment": "medium", "label": "10.000–75.000", "customers": 36 },
    { "segment": "high", "label": "> 75.000", "customers": 62 }
  ]
}
```

## Aturan Bisnis

- Atribusi penjualan ke sales rep dan kantor memakai penugasan saat ini (`customers.salesRepEmployeeNumber` → `employees.officeCode`). Dump tidak menyimpan riwayat penugasan; ini asumsi.
- `salesReps` hanya karyawan berjabatan `Sales Rep` (17 orang), termasuk 2 rep tanpa customer.
- `prospects` = customer terdaftar tanpa order sama sekali. Di data saat ini ke-24 prospek semuanya ber-credit limit 0, dan 22 customer tanpa sales rep semuanya prospek.
- `sharePct` = penjualan customer / penjualan total pada filter yang sama × 100.
- Segmen credit limit: `none` = 0; `low` = > 0 dan < 10.000; `medium` = 10.000 s.d. 75.000; `high` = > 75.000. Ini memperbaiki query no. 26 di `Axon SQL.sql`, yang tidak memasukkan nilai tepat 10.000 dan 75.000 ke segmen mana pun dan mencampur customer ber-limit 0 ke "Low".
- Query lain dari `Axon SQL.sql` yang tidak di-porting apa adanya: no. 22 (menghitung baris order, bukan jumlah produk), no. 24 (join ke `orderdetails` menggandakan baris dan hasilnya pembayaran, bukan customer), no. 3 (`LIMIT 2` untuk "tertinggi").
- Filter waktu memengaruhi penjualan, order, customer aktif, dan rata-rata nilai order; tidak memengaruhi customer terdaftar, prospek, dan segmen credit limit.
- Data yang tidak dikirim: nama kontak, telepon, alamat, email/ekstensi karyawan, credit limit per customer (lihat F00).

## Langkah Pengerjaan

- [ ] 1. Buat branch `feat/f04-pelanggan-tim-sales` dari `main` terbaru (F00 BE sudah ter-merge); ubah status F04 di `docs/PRD.md` §7 menjadi 🟨.
- [x] 2. `src/modules/customers/customers.dto.ts`: skema strict `year`, `continent`, `country` memakai skema bersama F00.
- [x] 3. `customers.service.ts`, query paralel (`Promise.all`) dengan WHERE dari `sqlFilters.ts`:
  - `kpi`: `customers`, `prospects`, `withoutSalesRep` (tidak terpengaruh filter waktu); `activeCustomers`, `avgOrderValue` (terpengaruh filter waktu).
  - `topCustomers` (10 teratas): nama perusahaan, negara, penjualan, order, `sharePct` terhadap penjualan total pada filter yang sama. Tanpa nama kontak, telepon, alamat.
  - `salesReps`: hanya jabatan `Sales Rep` (17 orang), LEFT JOIN agar rep tanpa customer tampil dengan nilai 0.
  - `offices`: per kantor (kota, negara, territory, customer, penjualan).
  - `creditSegments`: 4 segmen dengan batas `none` = 0, `low` > 0 dan < 10.000, `medium` 10.000–75.000, `high` > 75.000; agregat saja, tanpa credit limit per customer.
- [x] 4. Hindari pola keliru dari `Axon SQL.sql` (no. 3, 22, 24, 26) sesuai aturan bisnis; jangan menggandakan baris dengan join ke `payments`/`orderdetails` tanpa agregasi.
- [x] 5. Bungkus dengan `createTtlCache` dan `cacheKey`; tipe respons eksplisit, tanpa field terlarang.
- [x] 6. `customers.controller.ts`, `customers.routes.ts`; daftarkan `api.use('/dashboard/customers', customersRoutes)` di `src/app.ts`.
- [x] 7. Pastikan DB kosong → 200 (pembagian aman nol, `avgOrderValue` = `null` atau 0 secara konsisten).
- [x] 8. Asersi angka emas ke harness; tes kontrak: respons tidak memuat kunci `phone`, `email`, `contactFirstName`, `creditLimit`.
- [ ] 9. Catat keputusan Q3 (nama sales rep boleh tampil) di PRD §12; bila tidak, ganti `name` menjadi nomor karyawan/anonim dan samakan dengan dokumen FE.
- [x] 10. `npm run lint`, `npm test`, `npm run build` hijau.
- [x] 11. Commit terakhir: status F04 di PRD §7 menjadi 🟩, isi kolom PR; buka PR ke `main`.

## Kriteria Penerimaan

- [x] Tanpa filter: 122 customer, 98 aktif, 24 prospek, 22 tanpa sales rep, rata-rata nilai order 29.460,71.
- [x] Top 2 customer: Euro+ Shopping Channel 820.689,54 (26 order) dan Mini Gifts Distributors Ltd. 591.827,34 (17 order).
- [x] Jumlah customer per rep tertinggi: Pamela Castillo 10, Barry Jones 9 (sama dengan PPTX slide 14).
- [x] Penjualan rep tertinggi: Gerard Hernandez 1.258.577,81.
- [x] Penjualan kantor: Paris 3.083.761,58 tertinggi, Tokyo 457.110,07 terendah; total 7 kantor = 9.604.190,61.
- [x] Segmen credit limit: 24 / 0 / 36 / 62.
- [x] Tom King dan Yoshimi Kato muncul di `salesReps` dengan 0 customer.
- [x] Respons tidak memuat kunci `phone`, `email`, `contactFirstName`, `creditLimit`.

## Definisi Selesai

Langkah dan kriteria tercentang, CI hijau, status di PRD §7 = 🟩. FE F04 dapat memakai endpoint ini; F07 dapat memakai agregat customer.
