# F05 — Operasional Order (BE)

| | |
|---|---|
| Prioritas | P1 (bagian Indikasi Piutang: P2) |
| Repo / branch | BE · `feat/f05-operasional-order`; bagian piutang: `feat/f05-piutang` |
| Pasangan FE | `feat/f05-operasional-order` dan `feat/f05-piutang` di repo FE (halaman `/operasional`) |
| Endpoint | `GET /api/v1/dashboard/operations` |
| Padanan | Insight PPTX (slide 16, 17) dan query `Axon SQL.sql` no. 15, 17, 25. Tidak ada di Power BI |
| Bergantung pada | BE F00 |
| Status | 🟩 Selesai (belum dirilis) (piutang: ⬜, menunggu keputusan Q4) |

## Tujuan

Membuat order bermasalah terlihat sebelum pelanggan mengeluh: order yang tertahan, disengketakan, masih diproses, terlambat dikirim, serta nilai penjualan yang terkunci di order tersebut.

## User Stories

- Sebagai tim operasional, saya ingin melihat daftar order On Hold, Disputed, dan In Process beserta alasannya agar bisa segera ditindaklanjuti.
- Sebagai manajer, saya ingin tahu berapa lama rata-rata order dikirim dan order mana yang melewati tenggat agar proses fulfillment bisa diperbaiki.
- Sebagai manajer, saya ingin melihat nilai penjualan per status order, termasuk yang dibatalkan, agar tahu berapa omzet yang berisiko.
- (P2) Sebagai tim keuangan, saya ingin melihat indikasi tagihan yang belum dibayar agar tahu mengapa order tertahan karena credit limit.

## Kontrak API (sumber kebenaran)

`GET /api/v1/dashboard/operations?year=&status=`

```json
{
  "asOf": "2005-05-31",
  "kpi": { "orders": 326, "shipped": 303, "needsAttention": 13, "overdue": 4, "lateShipments": 1, "avgShipDays": 3.76 },
  "statusBreakdown": [{ "status": "On Hold", "orders": 4, "sales": 169575.61 }],
  "attentionOrders": [{
    "orderNumber": 10334, "orderDate": "2004-11-19", "requiredDate": "2004-11-28", "status": "On Hold",
    "customerName": "Volvo Model Replicas, Co", "sales": 23014.17,
    "comments": "The outstaniding balance for this customer exceeds their credit limit. Order will be shipped when a payment is received."
  }],
  "shippingLeadTime": [{ "bucket": "0-2", "orders": 99 }, { "bucket": "3-5", "orders": 163 }, { "bucket": "6-10", "orders": 49 }, { "bucket": ">10", "orders": 1 }],
  "slowestShipments": [{ "orderNumber": 10165, "customerName": "Dragon Souveniers, Ltd.", "days": 65 }],
  "receivables": { "billed": 9365336.43, "paid": 8853839.23, "outstanding": 511497.20, "customersOverCreditLimit": 3 }
}
```

`receivables` hanya ada bila P2 dikerjakan.

## Aturan Bisnis

- `asOf` = tanggal order terakhir di data (31 Mei 2005), bukan tanggal hari ini. Semua perhitungan "lewat tenggat" relatif terhadap `asOf`, karena data adalah snapshot historis.
- `lateShipments` = order dengan `shippedDate > requiredDate`.
- `overdue` = order belum dikirim, bukan Cancelled, dan `requiredDate < asOf`.
- `avgShipDays` = rata-rata `DATEDIFF(shippedDate, orderDate)` untuk order yang sudah dikirim, 2 desimal.
- `needsAttention` dan `attentionOrders` = status On Hold, Disputed, In Process; urut tenggat terlama dulu.
- `statusBreakdown` memakai definisi penjualan global (§6 PRD); jumlah seluruh status = penjualan total.
- Filter `year` berdasarkan `orderDate`. Filter `status` memengaruhi `statusBreakdown` dan `attentionOrders` saja.
- Query no. 25 `Axon SQL.sql` tidak di-porting apa adanya: join ke `payments` menggandakan jumlah produk dan total harga sebanyak jumlah pembayaran customer.

**Indikasi piutang (P2)**

- `billed` = penjualan semua order bukan Cancelled; `paid` = `SUM(payments.amount)`; `outstanding = billed − paid`.
- `customersOverCreditLimit` = customer dengan `(billed − paid) > creditLimit`. Hanya jumlahnya yang dikirim, bukan nama atau nilai per customer (minimasi data).
- Keterbatasan yang wajib ditampilkan di UI (tugas FE): pembayaran di dump tidak terhubung ke order tertentu, sehingga angka ini indikasi, bukan saldo piutang akuntansi.

## Langkah Pengerjaan

**Bagian inti (P1), branch `feat/f05-operasional-order`**

- [ ] 1. Buat branch `feat/f05-operasional-order` dari `main` terbaru (F00 BE sudah ter-merge); ubah status F05 di `docs/PRD.md` §7 menjadi 🟨.
- [x] 2. `src/modules/operations/operations.dto.ts`: skema strict `year`, `status` memakai skema bersama F00.
- [x] 3. `operations.service.ts`, query paralel (`Promise.all`):
  - `asOf` = `MAX(orderDate)` (bukan tanggal hari ini).
  - `kpi`: `orders`, `shipped`, `needsAttention`, `overdue`, `lateShipments`, `avgShipDays` (2 desimal, `DATEDIFF(shippedDate, orderDate)` untuk order terkirim).
  - `statusBreakdown` (order dan penjualan per status; total = penjualan global).
  - `attentionOrders`: status On Hold, Disputed, In Process, urut tenggat terlama dulu; `comments` dikirim apa adanya (pemotongan dan render teks biasa dilakukan FE).
  - `shippingLeadTime`: 4 bucket (0–2, 3–5, 6–10, >10 hari).
  - `slowestShipments`: 5 order dengan selisih hari terbesar.
- [x] 4. Terapkan aturan filter: `year` berbasis `orderDate`; `status` hanya memengaruhi `statusBreakdown` dan `attentionOrders`.
- [x] 5. Jangan mem-porting query no. 25 apa adanya (join ke `payments` menggandakan baris).
- [x] 6. Bungkus dengan `createTtlCache` dan `cacheKey`; tipe respons eksplisit; `receivables` tidak ada dalam tipe respons di tahap ini.
- [x] 7. `operations.controller.ts`, `operations.routes.ts`; daftarkan `api.use('/dashboard/operations', operationsRoutes)` di `src/app.ts`.
- [x] 8. Pastikan DB kosong → 200 (`asOf` `null`, rata-rata `null`, array kosong).
- [x] 9. Asersi angka emas ke harness; tes kontrak kunci terlarang.
- [x] 10. `npm run lint`, `npm test`, `npm run build` hijau.
- [x] 11. Commit terakhir: status F05 di PRD §7 menjadi 🟩, isi kolom PR; buka PR ke `main`.

**Bagian piutang (P2), branch `feat/f05-piutang`, hanya bila Q4 disetujui**

- [ ] 12. Buat branch `feat/f05-piutang` dari `main` terbaru; status baris piutang menjadi 🟨.
- [ ] 13. Tambah objek `receivables` (`billed`, `paid`, `outstanding`, `customersOverCreditLimit`) ke respons; hanya jumlah customer yang dikirim, bukan nama atau nilai per customer.
- [ ] 14. Tes: angka emas piutang; respons tidak memuat nama atau nilai per customer.
- [ ] 15. Perbarui kontrak di dokumen ini dan samakan dengan dokumen FE; `npm run lint`, `npm test`, `npm run build` hijau; PR ke `main`, status 🟩.

## Kriteria Penerimaan

- [x] Status: Shipped 303, Cancelled 6, In Process 6, On Hold 4, Resolved 4, Disputed 3.
- [x] Penjualan per status: Shipped 8.865.094,64; Cancelled 238.854,18; On Hold 169.575,61; In Process 135.271,52; Resolved 134.235,88; Disputed 61.158,78 (total 9.604.190,61).
- [x] 13 order perlu perhatian dengan nilai 366.005,91; 4 order On Hold seluruhnya beralasan credit limit terlampaui.
- [x] Rata-rata hari kirim 3,76; 1 pengiriman terlambat (order 10165, 65 hari); 4 order lewat tenggat.
- [x] Bucket lama kirim: 99 / 163 / 49 / 1 (total 312 order terkirim).
- [ ] (P2) Tagihan 9.365.336,43; dibayar 8.853.839,23; selisih 511.497,20; 3 customer melewati credit limit.

Kriteria tampilan (catatan `<script>` tampil sebagai teks, keterangan keterbatasan piutang) ada di dokumen FE.

## Definisi Selesai

Langkah dan kriteria tercentang, CI hijau, status di PRD §7 = 🟩. FE F05 dapat memakai endpoint ini; F07 dapat memakai jumlah order On Hold.
