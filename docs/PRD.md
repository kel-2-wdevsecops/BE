# PRD — Axon Sales Report (Dashboard Analytics) — Repo BE

| | |
|---|---|
| Versi | 1.0 (draf), versi khusus repo BE |
| Tanggal | 5 Oktober 2026 (dipisah per repo 6 Oktober 2026) |
| Pemilik dokumen | Developer fullstack, Kelompok 2 DevSecOps |
| Repositori | [FE](https://github.com/kel-2-wdevsecops/FE) · **BE (repo ini)** |
| Pasangan dokumen | `docs/PRD.md` di repo FE. Latar belakang, tujuan, dan definisi metrik sama di kedua repo; bagian teknis dan status fitur khusus per repo |
| Rujukan | `Bahan Materi/README.md`, `Bahan Materi/Axon_Sales_Analysis_SQL.pptx`, `Bahan Materi/Axon Sales.pbix`, `Bahan Materi/Axon SQL.sql`, `Bahan Materi/Axon sales - Mysql Database.sql`, README BE & FE |

Dokumen ini mencakup scope **backend**: API hanya-baca, query, validasi, cache, dan keamanan. Scope antarmuka (halaman, grafik, filter di URL) ada di PRD repo FE.

## 0. Alur Kerja Fitur dan Pelacakan Status

Tiap fitur dikerjakan di branch bernama **sama** di kedua repo. Konvensi: `feat/<id-fitur>-<slug>`, mis. `feat/f01-ringkasan` di repo FE dan `feat/f01-ringkasan` di repo BE. Nama branch tiap fitur tertulis di tabel §7 dan di header dokumen fitur.

Cara mengetahui posisi sebuah fitur di repo ini:

1. Buka papan status di §7. Kolom **Status** menunjukkan tahap fitur, kolom **Bergantung pada** menunjukkan apa yang harus selesai lebih dulu.
2. Buka `docs/features/<id>-*.md`. Bagian **Langkah Pengerjaan** adalah daftar centang; langkah yang sudah dicentang `[x]` sudah selesai, langkah `[ ]` pertama adalah pekerjaan berikutnya.

Alur satu fitur:

1. Baca dokumen fitur ini dan pasangannya di repo FE (kontrak API ada di dokumen BE; dokumen FE memuat salinannya).
2. `git switch main && git pull`, lalu `git switch -c feat/<id>-<slug>`.
3. Ubah baris fitur di §7 menjadi 🟨 pada commit pertama (`docs(<id>): mulai <fitur>`).
4. Kerjakan langkah satu per satu. Centang langkahnya pada commit yang sama dengan pekerjaannya.
5. Pesan commit mengikuti Conventional Commits (dicek husky dan CI): `feat(f01): ...`, `test(f01): ...`, `docs(f01): ...`. `feat` menaikkan versi minor, `fix` patch, `docs` dan `test` tidak menaikkan versi.
6. Sebelum PR: `npm run lint`, `npm test`, `npm run build` harus lulus tanpa warning.
7. Pada commit terakhir sebelum PR, ubah status menjadi 🟩 dan isi kolom PR. Merge PR ke `main`.
8. Setelah PR rilis release-please di-merge dan deploy sukses, ubah status menjadi 🚀 (commit `docs:` terpisah).

Legenda status: ⬜ belum mulai · 🟨 sedang dikerjakan · 🟩 selesai (sudah di `main`, belum dirilis) · 🚀 dirilis.

## 1. Latar Belakang

Axon adalah retailer miniatur (scale model) mobil klasik yang menjual ke 122 pelanggan grosir di 27 negara melalui 7 kantor penjualan. Data penjualannya (pelanggan, produk, order, pembayaran, karyawan, kantor) tersimpan di MySQL, tetapi tim sales tidak punya sistem terpusat untuk mengolah dan membacanya. Akibatnya laporan lambat tersedia, rawan tidak akurat, dan manajemen sulit melihat tren pasar sebelum mengambil keputusan.

Studi kasus sebelumnya menjawab masalah ini dengan laporan Power BI tiga halaman (Home, Products, Sales) dan kumpulan query SQL analitik. Laporan Power BI itu hanya bisa dibuka di Power BI Desktop/Service, tidak bisa di-deploy sebagai aplikasi, dan tidak melalui pipeline keamanan apa pun.

Proyek ini membangun ulang solusi BI tersebut sebagai aplikasi web fullstack yang di-deploy dengan kaidah DevSecOps: frontend React interaktif dan API hanya-baca yang cepat dan aman, dengan CI/CD GitHub Actions yang sudah tersedia.

## 2. Permasalahan (sudut pandang pengguna)

1. Manajemen tidak bisa melihat kinerja penjualan (omzet, profit, pertumbuhan) secara cepat dan konsisten, sehingga keputusan diambil dari laporan yang terlambat.
2. Tim sales tidak tahu pasar, product line, produk, dan pelanggan mana yang paling berkontribusi, sehingga strategi pemasaran dan stok tidak terarah.
3. Manajer sales tidak bisa membandingkan kinerja antarperiode (tahun, kuartal, bulan) untuk menilai apakah strategi berhasil.
4. Order bermasalah (On Hold, Disputed, terlambat dikirim) tidak terlihat sampai pelanggan mengeluh.
5. Laporan Power BI yang ada tidak bisa dibagikan sebagai tautan web, dan angkanya tidak bisa diaudit ulang dengan mudah.

## 3. Tujuan dan Ukuran Keberhasilan

Tujuan bisnis (dari README studi kasus): memberdayakan Axon untuk mengambil keputusan berbasis data, memperbaiki strategi penjualan, dan meningkatkan kinerja bisnis.

| Tujuan produk | Ukuran keberhasilan | Pemilik utama |
|---|---|---|
| Angka dashboard dapat dipercaya | Semua KPI tanpa filter sama persis dengan Power BI dan dump: penjualan 9.604.190,61; profit 3.825.880,25; 122 customer; 23 karyawan; 110 produk; 326 order | **BE** (angka dihitung di sini), FE (menampilkan apa adanya) |
| Pertanyaan bisnis utama terjawab dalam ≤ 3 klik | Setiap pertanyaan di §4 punya halaman dan visual yang menjawabnya | FE; BE menyediakan datanya |
| Dashboard cepat | API p95 < 300 ms saat cache kosong, < 50 ms saat cache terisi; FE menampilkan data pertama < 2,5 detik di jaringan 4G | **BE** (p95 API), FE (waktu tampil) |
| Aman sesuai DevSecOps | 0 temuan High/Critical dari Semgrep, Trivy, dan ZAP pada rilis; tidak ada data pribadi (telepon, alamat, email, nama kontak) di respons API | **BE** (respons, SAST, DAST), FE (CSP, SAST FE) |
| Mudah diakses | Skor aksesibilitas Lighthouse ≥ 90; semua filter bisa dioperasikan dengan keyboard | FE |

## 4. Pengguna dan Kebutuhan

| Persona | Pertanyaan yang ingin dijawab | Fitur |
|---|---|---|
| Manajemen / eksekutif | Berapa omzet dan profit? Apakah bisnis tumbuh? Pasar mana terbesar? | F01, F03, F07 |
| Manajer sales regional (NA, EMEA, APAC) | Bagaimana kinerja negara/benua saya? Sales rep mana yang paling produktif? | F01, F04 |
| Tim marketing & produk | Product line, produk, dan vendor apa yang paling laku? Produk apa yang tidak laku? Kapan musim ramai? | F02, F07 |
| Tim operasional / fulfillment | Order mana yang tertahan atau terlambat dikirim? | F05 |

Semua persona memakai dashboard yang sama tanpa login (keputusan tim, lihat risiko R1).

## 5. Sumber Data

Keputusan: **`Axon sales - Mysql Database.sql` adalah satu-satunya database sistem.** Dua file lain dipakai sebagai spesifikasi, bukan sebagai sumber data.

| File | Isi sebenarnya | Peran di sistem |
|---|---|---|
| `Axon sales - Mysql Database.sql` | Dump lengkap MySQL sample database `classicmodels` v3.1: DDL 8 tabel + FK + seluruh data (122 customer, 23 karyawan, 7 kantor, 326 order, 2.996 baris order, 273 pembayaran, 7 product line, 110 produk; order 6 Jan 2003 s.d. 31 Mei 2005) | **Database sistem.** Sudah menjadi basis `prisma/schema.prisma` dan migrasi `0_init` di BE |
| `Axon SQL.sql` | Bukan database: query eksplorasi dan analitik (28 soal) serta 2 stored procedure | Rujukan kebutuhan insight F04, F05, F07. Query di-porting ke service BE sebagai query berparameter, bukan dijalankan apa adanya |
| `Axon Sales.pbix` | Laporan Power BI yang mengimpor tabel yang sama dari MySQL lokal (`127.0.0.1:3306/classicmodels`), ditambah tabel `profit_table` (tidak ada di dump), tabel `Date` (`CALENDARAUTO`), kolom terhitung `Continent`, dan 8 measure DAX | Spesifikasi visual dan definisi metrik (F01–F03), serta acuan rekonsiliasi angka |

Alasan:

1. Hanya dump yang memiliki skema relasional (PK, FK, tipe `DECIMAL`/`DATE`) dan data lengkap, serta bisa diimpor langsung ke MySQL/MariaDB di lokal, CI, dan server.
2. Boilerplate BE sudah dibangun di atasnya (`prisma db pull` dan migrasi `0_init`), jadi tidak ada pekerjaan konversi.
3. `.pbix` adalah salinan impor dari database yang sama: total penjualan (9.604.190,61) dan profit (3.825.880,25) di dalamnya identik dengan hasil hitung dari dump. Formatnya biner tertutup, datanya tidak bisa dibaca aplikasi web, dan modelnya bergantung pada `profit_table` yang tidak ada di dump (hanya bisa direproduksi sebagai turunan `orderdetails × products`).
4. `Axon SQL.sql` tidak berisi data. Stored procedure di dalamnya butuh hak DDL (`CREATE PROCEDURE`), bertentangan dengan prinsip user DB hanya-`SELECT`. Beberapa query-nya juga keliru (lihat F04 dan F05), jadi hanya dipakai sebagai rujukan kebutuhan.

Masalah kualitas data yang harus ditangani di kode:

- Nilai negara dan kota dengan spasi di belakang (`"Norway  "` 2 baris, `"Auckland  "` 2 baris): tanpa `TRIM` jumlah negara terbaca 28, bukan 27.
- 24 customer ber-`creditLimit` 0 dan tidak pernah order (prospek); 22 customer tanpa sales rep.
- 14 order tanpa `shippedDate` (Cancelled 4, In Process 6, On Hold 4).
- 1 produk tidak pernah dipesan (`S18_3233` 1985 Toyota Supra).
- Kolom `productlines.image` dan `htmlDescription` kosong semua: tidak dipakai.
- Benua tidak ada di dump: dipetakan di kode (lihat §6).

## 6. Definisi Metrik Global

Definisi ini mengikat semua fitur. Tujuannya agar angka sama dengan Power BI. Definisi dihitung di BE; FE hanya menampilkannya.

| Istilah | Definisi |
|---|---|
| Penjualan (sales) | `SUM(quantityOrdered × priceEach)` dari `orderdetails`, **semua status order termasuk Cancelled** (sama dengan measure `Sale` Power BI). Penjualan order Cancelled = 238.854,18 |
| Profit | `SUM(quantityOrdered × (priceEach − products.buyPrice))` (sama dengan `profit_table[profit]`) |
| Margin profit | `profit / penjualan × 100`, 2 desimal. Tanpa filter: 39,84 % |
| Order | `COUNT(DISTINCT orderNumber)` |
| Customer (terdaftar) | Baris di `customers`. Hanya terpengaruh filter geografi |
| Customer aktif | Customer dengan ≥ 1 order pada filter yang berlaku. Tanpa filter: 98 |
| Periode | Berdasarkan `orders.orderDate`. Tahun data: 2003, 2004, 2005 (2005 hanya Januari–Mei) |
| Benua | Peta negara → benua mengikuti kolom `Continent` Power BI: Europe (16 negara), North America (USA, Canada), Asia (Singapore, Japan, Hong Kong, Philippines, Russia, Israel), Oceania (Australia, New Zealand), Africa (South Africa) |
| Growth | `(nilai − nilai periode kalender sebelumnya) / nilai periode sebelumnya × 100`. Januari 2004 dibandingkan Desember 2003. Tanpa pembanding atau pembanding 0 → `null`, tampil "—" |
| Periode parsial | Periode yang berakhir setelah tanggal order terakhir (31 Mei 2005), mis. tahun 2005 dan Q2 2005. Ditandai di UI |
| Mata uang | Dolar AS, ditampilkan dengan format Indonesia (`Intl.NumberFormat('id-ID')`), mis. `US$9.604.190,61`. BE mengirim angka mentah (number), format dilakukan di FE |

## 7. Ruang Lingkup, Prioritas, dan Papan Status BE

P0 = wajib untuk UTS (setara laporan Power BI). P1 = nilai tambah yang menjawab tujuan bisnis. P2 = opsional bila waktu cukup.

Status per 6 Oktober 2026. Baseline repo BE: boilerplate v1.0.1 (skema Prisma, config, middleware keamanan, util `ttlCache`, health check, CI/CD). `src/modules/` masih kosong.

| ID | Fitur | Prio | Endpoint BE | Branch | Bergantung pada (BE) | Status | PR | Dokumen |
|---|---|---|---|---|---|---|---|---|
| F00 | Fondasi API: validasi, cache, keamanan | P0 | semua | `feat/f00-fondasi-api` | – | 🟩 | – | [F00](features/F00-fondasi-api-keamanan.md) |
| F06 | Endpoint pilihan filter | P0 | `GET /dashboard/filters` | `feat/f06-filter-tautan` | F00 | 🟩 | – | [F06](features/F06-filter-tautan.md) |
| F01 | Ringkasan penjualan | P0 | `GET /dashboard/overview` | `feat/f01-ringkasan` | F00 | 🟩 | – | [F01](features/F01-ringkasan.md) |
| F02 | Analisis produk | P0 | `GET /dashboard/products` | `feat/f02-produk` | F00 | 🟩 | – | [F02](features/F02-produk.md) |
| F03 | Analisis pertumbuhan | P0 | `GET /dashboard/growth` | `feat/f03-pertumbuhan` | F00 | 🟩 | – | [F03](features/F03-pertumbuhan.md) |
| F04 | Pelanggan dan tim sales | P1 | `GET /dashboard/customers` | `feat/f04-pelanggan-tim-sales` | F00 | ⬜ | – | [F04](features/F04-pelanggan-tim-sales.md) |
| F05 | Operasional order | P1 (piutang P2) | `GET /dashboard/operations` | `feat/f05-operasional-order` (piutang: `feat/f05-piutang`) | F00 | ⬜ | – | [F05](features/F05-operasional-order.md) |
| F07 | Sorotan insight dan rekomendasi | P1 | `GET /dashboard/insights` | `feat/f07-sorotan-insight` | F00; sebaiknya setelah F01–F05 | ⬜ | – | [F07](features/F07-sorotan-insight.md) |

Semua endpoint berada di bawah `/api/v1`, hanya `GET`, dan memakai amplop `{ success, message, data, errors? }` yang sudah ada.

Pasangan di repo FE: F00 tidak punya pekerjaan FE; F01–F07 masing-masing punya branch FE dengan nama yang sama. Status FE dilacak di PRD repo FE.

## 8. Di Luar Ruang Lingkup

- Login, akun, peran (RBAC), dan endpoint tulis (create/update/delete).
- ETL, sinkronisasi, atau data real-time. Data adalah dump statis; "akses terkini" berarti dashboard membaca langsung dari database dengan cache maksimal 5 menit.
- Forecasting/machine learning, ekspor PDF/Excel, notifikasi email.
- Halaman detail per customer dan per karyawan (berisi data pribadi).
- Perubahan skema database (tabel/view/index tambahan) dan stored procedure.

## 9. Kebutuhan Non-Fungsional (sisi BE)

**Keamanan (DevSecOps)**

- API hanya-baca. User DB aplikasi hanya punya hak `SELECT`.
- Semua query memakai Prisma Client atau `$queryRaw` tagged template; `$queryRawUnsafe` dan penggabungan string SQL dilarang (ditambahkan sebagai aturan Semgrep custom di CI).
- Semua query string divalidasi Zod secara ketat: nilai di luar daftar yang diizinkan dan parameter tak dikenal ditolak 422.
- Minimasi data: respons hanya memuat agregat, nama perusahaan customer, nama dan kantor sales rep. Telepon, alamat, email, ekstensi, nama kontak, nomor cek, dan credit limit per customer tidak pernah dikirim.
- Lapisan yang sudah ada dipertahankan: helmet, CORS hanya `GET`, tanpa body parser, rate limit 120/menit per IP, tanpa stack trace di produksi, container non-root, Trivy, Gitleaks, SBOM, Cosign, provenance, ZAP.
- Endpoint tetap menjawab 200 dengan nilai nol/array kosong pada database kosong (DAST di pipeline deploy berjalan pada DB hasil migrasi `0_init` tanpa data).

**Performa**

- Agregasi dilakukan di SQL, bukan di memori Node. Query satu endpoint dijalankan paralel.
- Hasil di-cache `createTtlCache` (TTL 5 menit, maksimal 500 entri) dengan key filter yang dinormalisasi; respons diberi `Cache-Control: public, max-age=300`.
- Ukuran respons dibatasi (daftar top-N tetap, daftar produk maksimal 110 baris).

**Keandalan dan observabilitas**

- Health check `/api/v1/health` (cek DB) dipakai deploy dan rollback otomatis.
- Log akses `morgan combined` dengan IP asli dari `CF-Connecting-IP`; tidak ada data pribadi di log.

**Kualitas**

- Fungsi murni (peta benua, growth, normalisasi filter, konversi angka) ber-unit test Vitest.
- Tes rekonsiliasi "angka emas" terhadap dump (lihat F00) dijalankan sebelum rilis.
- Lint tanpa warning, typecheck, Conventional Commits (sudah ditegakkan CI dan husky).

Kebutuhan aksesibilitas dan UX (responsif, kontras, loading/error/kosong) ada di PRD repo FE.

## 10. Arsitektur Ringkas

```text
Browser ──HTTPS──> Cloudflare ──Tunnel──> devsecops_fe (nginx :8080, SPA + CSP)
                                              │ /api/
                                              ▼
                                         devsecops_be (Express :3008)   <── repo ini
                                              │ SELECT-only
                                              ▼
                                         mysql (classicmodels)
```

- **BE**: `src/modules/<fitur>/` berisi `routes`, `controller`, `dto` (Zod), `service` (query). Fungsi murni bersama di `src/lib/` (`continents.ts`, `growth.ts`, `filters.ts`). Satu endpoint per halaman agar FE cukup satu request per perubahan filter.
- Alur FE (komponen → hook → `api.*` → `http`) dijelaskan di PRD repo FE.

## 11. Rencana Rilis

Setiap rilis melalui PR fitur → CI → merge ke `main` → PR rilis release-please → deploy.

Repo FE dan BE punya versi sendiri (release-please per repo, saat ini FE 1.0.0 dan BE 1.0.1), jadi nomor di tabel adalah **gelombang rilis**: tahan PR rilis tetap terbuka sampai semua fitur dalam gelombang itu ter-merge, lalu merge sekali. Nomor versi aktual ditentukan release-please dari pesan commit.

| Gelombang | Isi (BE) |
|---|---|
| v1.1.0 | F00, F06 (endpoint `/filters`), F01 |
| v1.2.0 | F02, F03 |
| v1.3.0 | F04, F05 (tanpa bagian piutang) |
| v1.4.0 | F07, bagian piutang F05 bila disetujui |

Urutan rilis antar repo: rilis BE lebih dulu atau bersamaan dengan FE pada gelombang yang sama. Deploy FE yang memanggil endpoint yang belum ada di BE produksi akan menampilkan halaman gagal muat.

## 12. Asumsi, Risiko, dan Pertanyaan Terbuka

Asumsi:

- A1. Data tidak berubah selama proyek; cache 5 menit dapat diterima.
- A2. `buyPrice` adalah harga beli saat ini dan dipakai untuk semua periode (tidak ada harga historis), sama dengan Power BI.
- A3. Filter waktu Power BI diasumsikan berbasis `orderDate`. Relasi tabel `Date` ke `orders` tidak terdeteksi saat model `.pbix` dibaca, jadi perilaku slicer tahun di Power BI tidak bisa diverifikasi; definisi di §6 yang berlaku.
- A4. (Terselesaikan oleh pemisahan dokumen) Folder `docs/` sebelumnya berada di root `project-uts` yang bukan repositori git. Sekarang dokumen ada di `docs/` di dalam repo BE dan FE sehingga ikut ter-versi.

Risiko:

- R1. **Dashboard publik berisi data bisnis.** Keputusan tim adalah tanpa login. Mitigasi: minimasi data (§9), rate limit, tanpa endpoint detail per orang. Bila data dianggap rahasia, perlu autentikasi (di luar ruang lingkup saat ini).
- R2. Angka berbeda dengan Power BI karena perbedaan definisi (Cancelled, benua, periode). Mitigasi: definisi §6 dikunci dan dicek dengan tes angka emas.
- R3. ZAP pada DB kosong memicu error 500 bila ada pembagian nol atau `null` tak tertangani. Mitigasi: kriteria "DB kosong" di F00.

Pertanyaan terbuka (perlu keputusan tim; dampak ke BE di kolom kanan):

| # | Pertanyaan | Default dokumen ini | Dampak di BE |
|---|---|---|---|
| Q1 | Apakah order Cancelled tetap dihitung dalam penjualan (paritas Power BI) atau dikecualikan? | Dihitung, dan nilainya ditampilkan terpisah di F05 | Definisi penjualan di semua query (F01–F05, F07) |
| Q2 | Russia dan Israel dikelompokkan ke Asia mengikuti Power BI. Tetap begitu? | Tetap di Asia | Isi peta `src/lib/continents.ts` |
| Q3 | Apakah nama sales rep boleh ditampilkan di dashboard publik (F04)? | Boleh | Field `name` di `salesReps` (F04) |
| Q4 | Apakah bagian piutang F05 (P2) dikerjakan? | Belum diputuskan | Field `receivables` di F05 (branch `feat/f05-piutang`) |

## 13. Catatan Pemisahan Dokumen dan Asumsi Penempatan

Dokumen ini dan dokumen fitur di `docs/features/` dipisah dari dokumen gabungan FE+BE. Isi dan substansi fitur tidak diubah; hanya dipilah per repo. Bagian yang ambigu diputuskan sebagai berikut:

- **Kontrak API.** Sumber kebenaran ada di dokumen fitur BE. Dokumen fitur FE memuat salinan yang sama. Bila kontrak berubah, ubah di dokumen BE lebih dulu, lalu samakan di dokumen FE pada branch FE.
- **F00.** Seluruhnya scope BE. Dokumen FE untuk F00 hanya berisi catatan bahwa tidak ada pekerjaan FE.
- **`growth.ts` dan `insights.ts`.** F00 mencantumkan `growth.ts` dalam struktur kode. Karena hanya dipakai F03, file ini dikerjakan di branch F03. `insights.ts` dikerjakan di branch F07.
- **Kriteria F00 yang butuh endpoint** (422, header cache, DB kosong 200) tidak bisa dibuktikan tanpa endpoint. Di branch F00 dibuktikan lewat unit test skema dan cache; pembuktian pada endpoint nyata terjadi di F06/F01.
- **`LOW_STOCK_THRESHOLD`** dipakai F02 dan F07; didefinisikan sekali (F02) dan di-import F07.
- **Kriteria penerimaan F06 sisi BE** diturunkan dari kontrak `/filters` dan angka di PRD (asli dokumen F06 hanya memuat kriteria perilaku FE).
- **F05 piutang (P2)** dikerjakan di branch terpisah `feat/f05-piutang` karena jadwal rilisnya berbeda.
- **Dokumen gabungan lama** di `project-uts/docs/` (root, di luar git) tidak diubah dan tidak dihapus.
