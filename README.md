# Axon Sales API (BE)

Kerangka (boilerplate) API **publik dan hanya-baca** untuk dashboard penjualan Axon, retailer miniatur mobil klasik. Datanya adalah database MySQL `classicmodels` (dump-nya ada di folder `Context/` di samping folder repo ini). Dashboard-nya meniru laporan Power BI Axon (tiga halaman: Ringkasan, Produk, Pertumbuhan).

Repo ini baru berisi fondasi: skema Prisma, konfigurasi, middleware keamanan, util, health check, dan pipeline CI/CD. Modul dashboard-nya dibangun di `src/modules/` dengan pola di bawah.

Tidak ada login, akun, maupun endpoint tulis: dump aslinya tidak punya tabel pengguna, dan dashboard memang terbuka untuk umum. Karena hanya membaca, user DB aplikasi cukup punya hak `SELECT`.

Stack: Node.js 24, TypeScript, Express 5, Prisma 7 (adapter `mariadb`, kompatibel MySQL/MariaDB), Zod 4, Vitest.

## Menjalankan di lokal

1. **Impor dump** ke MySQL/MariaDB (membuat database `classicmodels`):
   ```bash
   mariadb -u root -p < "../Context/Axon sales - Mysql Database.sql"
   ```
2. **Buat user DB untuk aplikasi**, hanya dengan hak baca (jangan pakai root):
   ```sql
   CREATE USER 'classicmodels_app'@'localhost' IDENTIFIED BY '<password>';
   GRANT SELECT ON classicmodels.* TO 'classicmodels_app'@'localhost';
   ```
3. **Konfigurasi**: salin `.env.example` ke `.env`, lalu isi `DATABASE_URL`.
4. **Install & generate client**:
   ```bash
   npm install
   npm run db:generate
   ```
5. `npm run dev` lalu buka `http://localhost:3008/api/v1/health`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dev dengan reload (tsx watch) |
| `npm run build` / `npm start` | Kompilasi ke `dist/` / jalankan hasilnya |
| `npm test` | Unit test (Vitest, file `*.test.ts` di samping kodenya) |
| `npm run lint` | ESLint, warning pun gagal (sama dengan CI) |
| `npm run db:generate` | Generate Prisma client ke `src/generated/prisma` (tidak di-commit) |
| `npm run db:pull` | Introspeksi ulang DB ke `prisma/schema.prisma` |
| `npm run db:migrate` / `db:deploy` | Migrasi Prisma (butuh user ber-hak DDL; lihat bagian Skema) |

## Struktur

```text
prisma/
  schema.prisma          8 model hasil `prisma db pull`, sama persis dengan dump
  migrations/0_init      baseline dari dump
src/
  app.ts                 middleware global, /health, pendaftaran route modul
  server.ts              bootstrap + graceful shutdown
  config/                env (divalidasi saat start) & Prisma client
  middleware/            error handler (Zod -> 422), rate limit
  modules/               satu folder per modul (masih kosong)
  utils/                 ApiResponse, asyncHandler, clientIp, ttlCache
```

## Menambah modul

Satu folder per modul, mis. `src/modules/dashboard/`:

- **`<nama>.routes.ts`**: `Router` Express, hanya `GET`. Daftarkan di `src/app.ts`: `api.use('/<nama>', <nama>Routes)`.
- **`<nama>.controller.ts`**: tipis. Parse query string dengan DTO, panggil service, kirim `ApiResponse.success`. Setiap handler dibungkus `asyncHandler`, supaya error (termasuk `ZodError` -> 422) sampai ke error middleware.
- **`<nama>.dto.ts`**: skema Zod untuk query string (filter). Nilai yang tidak valid ditolak, bukan ditebak.
- **`<nama>.service.ts`**: query Prisma. Agregat lintas tabel boleh `prisma.$queryRaw` **tagged template** (nilai filter jadi parameter terikat); jangan pernah `$queryRawUnsafe` atau string SQL yang digabung manual. Potongan kondisi dinamis disusun dengan `Prisma.sql` dan `Prisma.join`.
- Fungsi murni (perhitungan, pemetaan) di `lib/` dengan file `*.test.ts` di sampingnya.

Catatan data:
- `COUNT` dari `$queryRaw` datang sebagai `bigint` dan `SUM` sebagai `Decimal`: ubah ke `number` sebelum dikirim sebagai JSON.
- Data dump tidak berubah, jadi hasil agregat boleh di-cache dengan `utils/ttlCache.ts`, dan respons boleh diberi `Cache-Control: public, max-age=300`.
- Ada nilai negara dengan spasi di belakang (`"Norway  "`); trim sebelum dipakai sebagai label.

## Target dashboard

Tiga halaman, meniru laporan Power BI Axon (screenshot ada pada tim). Semua endpoint di bawah `/api/v1`, format `{ success, message, data, errors? }`.

| Halaman | Isi | Filter |
|---|---|---|
| Ringkasan | total penjualan, profit, customer, karyawan; customer per benua & per negara; top 5 negara; penjualan per tahun | tahun, benua, negara |
| Produk | penjualan per produk, order per bulan & per tahun, penjualan per product line, top 5 vendor | product line (pilihan ganda) |
| Pertumbuhan | tabel YoY, QoQ, MoM (dengan nilai periode sebelumnya), penjualan & profit per tahun | tahun |

Definisi angka, supaya hasilnya bisa dicocokkan dengan Power BI:

- **Penjualan** = `SUM(quantityOrdered × priceEach)`, **profit** = `SUM(quantityOrdered × (priceEach − buyPrice))`, dari semua order termasuk yang Cancelled. Total tanpa filter: penjualan 9.604.190,61, profit 3.825.880,25; 122 customer, 23 karyawan, 110 produk, 326 order.
- **Benua** tidak ada di dump; perlu peta negara -> benua di kode (27 negara customer).
- **Growth** dibandingkan dengan periode kalender sebelumnya (Januari 2004 vs Desember 2003). Periode tanpa pembanding tampil "—", bukan "Infinity" seperti di Power BI. Data 2005 hanya sampai Mei.

### Keamanan endpoint publik (sudah terpasang)

- Rate limit 120 request/menit per IP untuk seluruh `/api/v1` (`middleware/rateLimit.middleware.ts`).
- Tanpa body parser, CORS hanya `GET`, header keamanan lewat helmet.
- User DB hanya `SELECT`.

## Skema

`prisma/schema.prisma` sama persis dengan dump. Aplikasi tidak pernah menjalankan migrasi: container langsung `node dist/server.js`. Migrasi `0_init` dipakai untuk membuat tabel di DB kosong (uji migrasi di CI, DB untuk DAST di deploy). Kalau suatu saat perlu `prisma migrate dev` di DB lokal yang berisi dump, tandai baseline sekali dengan user ber-hak DDL:

```bash
DATABASE_URL="mysql://root:<pw>@localhost:3306/classicmodels" npx prisma migrate resolve --applied 0_init
```

Nama model dan kolom mengikuti dump apa adanya: tabel jamak huruf kecil, kolom camelCase, misalnya `customers.customerNumber`.

## CI/CD

- **Pull request ke `main`** (`ci.yml`): commitlint, lint, `npm audit`, test, typecheck, uji migrasi ke MariaDB kosong, SAST (Semgrep), secret scan (Gitleaks), SCA (Trivy fs), SBOM.
- **Push ke `main`** (`release.yml`): CI dijalankan dulu, lalu release-please membuka atau memperbarui **PR rilis** berdasarkan pesan commit.
- **PR rilis di-merge**: tag `vX.Y.Z` dibuat, lalu `deploy.yml` berjalan: build, scan image, DAST (ZAP), push ke GHCR, sign (Cosign), provenance, verifikasi di server, deploy, health check, dan rollback otomatis.

Deploy **hanya** terjadi saat PR rilis di-merge. Biarkan PR rilis terbuka sampai server siap.

Pesan commit wajib [Conventional Commits](https://www.conventionalcommits.org/). Ini dicek hook husky dan CI, dan dipakai release-please untuk menentukan versi: `feat` menaikkan minor, `fix` patch, `!` major.

Pengecualian kerentanan yang diterima ada di `.trivyignore`, lengkap dengan alasan dan tanggal kedaluwarsa. Paket-paket itu hanya ada di CLI Prisma (devDependency), tidak di image produksi.

### Topologi server

Semua container berada di satu network Docker, `uts-net`, dan **tidak ada port aplikasi yang di-publish ke host**:

```text
internet -> Cloudflare -> cloudflared --uts-net--> devsecops_fe (nginx :8080)
                                                     | /api/
                                                     v
                                                   devsecops_be (:3008) --> mysql (:3306)
```

- BE (`compose.yaml` repo ini) dan FE (`compose.yaml` repo FE) di-deploy terpisah, tapi keduanya bergabung ke `uts-net` dan saling menjangkau lewat nama service.
- `BEHIND_CLOUDFLARE=true`: IP pengunjung dibaca dari header `CF-Connecting-IP`. Ini hanya aman karena BE dan FE tidak bisa dijangkau tanpa lewat Cloudflare.
- Health check workflow berjalan di dalam container (`docker compose exec ... wget`), bukan lewat port host.

### Persiapan server (sekali, sebelum merge PR rilis pertama)

Server: self-hosted runner Windows, folder `D:\.server\kuliah\d4\devsecops\uts`.

1. Buat network: `docker network create uts-net`. Workflow deploy juga membuatnya kalau belum ada.
2. Jalankan container MySQL/MariaDB dan cloudflared di network itu (`--network uts-net`, atau `networks: [uts-net]` dengan `external: true` di compose masing-masing). Port MySQL tidak perlu di-publish ke host.
3. Impor dump ke container MySQL, lalu buat user aplikasi dengan `GRANT SELECT` saja (langkah 1–2 di atas). Host user-nya `'%'` atau subnet `uts-net`, karena koneksi datang dari container lain, bukan `localhost`.
4. Isi GitHub Secrets:
   - `DATABASE_URL`, dengan host berupa nama container MySQL, mis. `mysql://classicmodels_app:<pw>@mysql:3306/classicmodels`.
   - `NTFY_TOPIC`.

   Lalu jalankan workflow **Update Env Variables**.
5. Arahkan public hostname di Cloudflare Tunnel ke `http://devsecops_fe:8080`. API ikut lewat proxy `/api/` milik nginx FE. Kalau perlu hostname API terpisah, arahkan ke `http://devsecops_be:3008`.
6. Nyalakan "Allow GitHub Actions to create and approve pull requests" (Settings → Actions → General, di tingkat organisasi lalu repo).
