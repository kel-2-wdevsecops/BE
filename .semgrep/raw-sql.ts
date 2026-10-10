// Contoh untuk `semgrep test .semgrep/`; bukan kode aplikasi.
declare const prisma: any;
declare const year: string;

// ruleid: prisma-raw-sql-unsafe
prisma.$queryRawUnsafe(`SELECT * FROM orders WHERE YEAR(orderDate) = ${year}`);

// ruleid: prisma-raw-sql-unsafe
prisma.$executeRawUnsafe('DELETE FROM orders');

// ruleid: prisma-raw-sql-unsafe
prisma.$executeRaw`DELETE FROM orders WHERE orderNumber = ${year}`;

// ok: prisma-raw-sql-unsafe
prisma.$queryRaw`SELECT * FROM orders WHERE YEAR(orderDate) = ${year}`;
