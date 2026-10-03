# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.21.0

################################################################################
# Tahap build: `prisma generate` + `tsc` dijalankan DI DALAM Alpine, lingkungan
# yang sama dengan produksi. Hasil generate/kompilasi tidak pernah dibawa dari
# mesin developer (dist/ tidak di-commit, src/generated ada di .dockerignore):
# hasil `prisma generate` dari OS lain bisa berisi engine native yang salah
# platform, dan image jadi tidak bisa menyambung ke DB.
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Source disalin SEBELUM generate, supaya client Prisma yang dipakai pasti
# hasil generate di sini, bukan salinan dari host.
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# prisma.config.ts membaca DATABASE_URL lewat env(), yang gagal kalau kosong.
# `generate` tidak menyambung ke DB, jadi URL palsu cukup.
RUN DATABASE_URL="mysql://build:build@localhost:3306/build" npx prisma generate
RUN npm run build

################################################################################
# Tahap final: hanya dependency produksi + hasil build.
FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV production

# Dikunci UTC — driver MySQL (`mariadb`) membaca kolom DATETIME (yang tidak
# menyimpan info zona waktu) lalu membuat objek Date pakai timezone LOKAL
# proses ini. Tanpa ini, kebenarannya cuma kebetulan ikut default image/host.
ENV TZ=UTC

WORKDIR /usr/src/app

# Dependency di-install di dalam Alpine, jadi modul native (argon2) di-compile
# untuk musl, bukan dibawa dari host.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Run the application as a non-root user.
USER node

COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node ./prisma ./prisma
COPY --chown=node:node ./prisma.config.ts ./
COPY --chown=node:node ./package.json ./

# Expose the port that the application listens on.
EXPOSE 3008

# Terapkan migrasi Prisma yang belum jalan (read-only terhadap migration
# files, aman dipanggil berulang) sebelum server dinyalakan tiap kali
# container start. Database yang sudah berisi dump classicmodels harus
# ditandai sekali dengan `prisma migrate resolve --applied 0_init` (lihat
# CLAUDE.md), kalau tidak migrasi 0_init gagal karena tabelnya sudah ada.
# `prisma` sengaja ada di "dependencies" package.json supaya CLI-nya ikut
# ter-install meski image pakai `npm ci --omit=dev`.
# Server dijalankan dengan `exec node`, bukan `npm start`: sh dan npm tidak
# meneruskan SIGTERM, jadi tanpa exec graceful shutdown di server.ts tidak
# pernah jalan dan Docker membunuh proses (SIGKILL) setelah 10 detik.
# compose.yaml juga memasang `init: true` (tini) sebagai PID 1.
CMD ["sh", "-c", "npm run db:deploy && exec node dist/server.js"]
