# Axon Sales API (BE)

REST API untuk data penjualan Axon, retailer miniatur mobil klasik. Datanya adalah database MySQL `classicmodels` (dump-nya ada di folder `Context/` di samping folder repo ini). Repo ini baru berisi **boilerplate**: kerangka aplikasi, skema Prisma, auth, satu modul contoh (`offices`), dan pipeline CI/CD. Modul data lainnya dibangun di atasnya dengan pola yang sama.

Stack: Node.js 24, TypeScript, Express 4, Prisma 7 (adapter `mariadb`, kompatibel MySQL/MariaDB), Zod, JWT + argon2, Vitest.

## Menjalankan di lokal

1. **Impor dump** ke MySQL/MariaDB (membuat database `classicmodels`):
   ```bash
   mariadb -u root -p < "../Context/Axon sales - Mysql Database.sql"
   ```
2. **Buat user DB untuk aplikasi** dengan hak minimal (jangan pakai root):
   ```sql
   CREATE USER 'classicmodels_app'@'localhost' IDENTIFIED BY '<password>';
   GRANT SELECT, INSERT, UPDATE, DELETE ON classicmodels.* TO 'classicmodels_app'@'localhost';
   ```
3. **Konfigurasi**: salin `.env.example` ke `.env`, lalu isi `DATABASE_URL` dan `JWT_SECRET` (minimal 32 karakter acak).
4. **Install & migrasi**:
   ```bash
   npm install
   # Database sudah berisi dump: tandai baseline sekali saja, lalu terapkan
   # migrasi berikutnya. Perintah migrasi butuh hak DDL, jadi pakai user root.
   DATABASE_URL="mysql://root:<pw>@localhost:3306/classicmodels" npx prisma migrate resolve --applied 0_init
   DATABASE_URL="mysql://root:<pw>@localhost:3306/classicmodels" npm run db:deploy
   npm run db:generate
   ```
5. **Admin pertama** (tidak ada register publik):
   ```bash
   SEED_ADMIN_EMAIL=admin@contoh.id SEED_ADMIN_PASSWORD='<min 8 karakter>' npm run db:seed
   ```
6. `npm run dev` lalu buka `http://localhost:3008/api/v1/health`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dev dengan reload (tsx watch) |
| `npm run build` / `npm start` | Kompilasi ke `dist/` / jalankan hasilnya |
| `npm test` | Unit test (Vitest, file `*.test.ts` di samping kodenya) |
| `npm run lint` | ESLint, warning pun gagal (sama dengan CI) |
| `npm run db:pull` | Introspeksi ulang DB ke `prisma/schema.prisma` |
| `npm run db:generate` | Generate Prisma client ke `src/generated/prisma` (tidak di-commit) |
| `npm run db:migrate` | Buat + terapkan migrasi baru (dev, butuh hak DDL) |
| `npm run db:deploy` | Terapkan migrasi yang belum jalan (juga dijalankan container saat start) |
| `npm run db:seed` | Buat admin pertama |

## Struktur

```
prisma/
  schema.prisma          8 model hasil `prisma db pull` + model users
  migrations/0_init      baseline dari dump (lihat langkah 4)
  migrations/*_add_users tabel akun API
  seed.ts                admin pertama
src/
  app.ts                 middleware global, /health, pendaftaran route
  server.ts              bootstrap + graceful shutdown
  config/                env (divalidasi saat start) & Prisma client
  middleware/            auth (JWT + peran), error handler, rate limit
  modules/<nama>/        satu folder per resource (lihat di bawah)
  utils/                 ApiResponse, asyncHandler + paginasi, validator Zod, httpError
```

Nama model dan kolom mengikuti dump apa adanya: tabel jamak huruf kecil, kolom camelCase, misalnya `customers.customerNumber`. Relasi memakai nama bawaan Prisma: `customers.employees` adalah sales rep, `employees.employees` atasan (`reportsTo`), dan `employees.other_employees` bawahan langsung.

## Menambah modul (ikuti `src/modules/offices`)

Setiap resource terdiri dari empat file:

- **`<nama>.routes.ts`**: `Router` Express. Pasang `authMiddleware`; baca untuk semua akun, tulis dengan `requireRole('admin')`.
- **`<nama>.controller.ts`**: tipis. Parse DTO, panggil service, kirim `ApiResponse`. Setiap handler dibungkus `asyncHandler`.
- **`<nama>.dto.ts`**: skema Zod. `UpdateXDto` = create tanpa primary key, `.partial()`. Panjang string harus sama dengan `VARCHAR(n)` di schema (dump ini tidak memakai default 191). Validator bersama ada di `utils/validators.ts`: `str`, `optStr`, `intId`, `money` (DECIMAL 10,2), `isoDate` (kolom DATE), dan `intParam` (param path numerik).
- **`<nama>.service.ts`**: logika bisnis & query Prisma. Error yang diharapkan dilempar dengan `httpError(status, pesan, field?)`.

Lalu daftarkan di `src/app.ts`: `api.use('/<nama>', <nama>Routes)`. Route bertingkat (`/orders/:orderNumber/details`) harus didaftarkan **sebelum** induknya.

Aturan data yang perlu diingat:
- Primary key diisi aplikasi (bukan auto-increment), jadi masuk ke DTO create. Cek duplikat (409), dan key tidak bisa diubah lewat update.
- Semua foreign key `ON DELETE RESTRICT`. Tolak hapus data yang masih dirujuk dengan 409 beserta pesan jumlahnya, seperti `offices.service.ts`. `P2003` dari Prisma juga sudah dipetakan ke 409.
- Kolom uang (`DECIMAL(10,2)`) selalu keluar sebagai string 2 desimal (`"136.00"`), lihat `config/database.ts`. Jangan menjumlahkan uang dengan float.

## API

Semua di bawah `/api/v1` dengan format `{ success, message, data, errors?, meta? }`. List mendukung `?page=`, `?per_page=` (maksimal 100), dan `?search=`.

| Endpoint | Akses |
|---|---|
| `GET /health` | publik, cek DB + versi rilis |
| `POST /auth/login`, `POST /auth/refresh` | publik (rate limited) |
| `GET /auth/me`, `POST /auth/logout`, `PUT /auth/password` | login |
| `GET/POST/PUT/DELETE /users[/:id]` | admin |
| `GET /offices[/:code]` | login |
| `POST/PUT/DELETE /offices[/:code]` | admin |

Header auth: `Authorization: Bearer <access_token>`. Logout, ganti password, dan reset password oleh admin mencabut semua token akun itu.

## CI/CD

- **Pull request ke `main`** (`ci.yml`): commitlint, lint, `npm audit`, test, typecheck, uji migrasi ke MariaDB kosong, SAST (Semgrep), secret scan (Gitleaks), SCA (Trivy fs), SBOM.
- **Push ke `main`** (`release.yml`): CI dijalankan dulu, lalu release-please membuka atau memperbarui **PR rilis** berdasarkan pesan commit.
- **PR rilis di-merge**: tag `vX.Y.Z` dibuat, lalu `deploy.yml` berjalan: build, scan image, DAST (ZAP), push ke GHCR, sign (Cosign), provenance, verifikasi di server, deploy, health check, dan rollback otomatis.

Deploy **hanya** terjadi saat PR rilis di-merge. Biarkan PR rilis terbuka sampai server siap.

Pesan commit wajib [Conventional Commits](https://www.conventionalcommits.org/). Ini dicek hook husky dan CI, dan dipakai release-please untuk menentukan versi: `feat` menaikkan minor, `fix` patch, `!` major.

Pengecualian kerentanan yang diterima ada di `.trivyignore`, lengkap dengan alasan dan tanggal kedaluwarsa.

### Persiapan server (sekali, sebelum merge PR rilis pertama)

Server: self-hosted runner Windows, folder `D:\.server\kuliah\d4\devsecops\uts`.

1. Impor dump ke DB server, lalu jalankan `npx prisma migrate resolve --applied 0_init` dengan user ber-hak DDL.
2. Isi GitHub Secrets `DATABASE_URL` (host `host.docker.internal` dari dalam container; user-nya butuh hak DDL karena container menjalankan migrasi saat start), `JWT_SECRET`, `JWT_REFRESH_SECRET`, dan `NTFY_TOPIC`. Lalu jalankan workflow **Update Env Variables**.
3. Nyalakan Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests".
4. Setelah deploy pertama, buat admin dengan seed (langkah 5 di atas, memakai `DATABASE_URL` server).
