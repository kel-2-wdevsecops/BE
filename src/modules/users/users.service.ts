import argon2 from 'argon2';
import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma/client';
import { buildMeta } from '../../utils/apiResponse';
import { parsePagination } from '../../utils/asyncHandler';
import { httpError, notFound } from '../../utils/httpError';
import { formatUser } from '../auth/auth.service';
import type { CreateUserInput, UpdateUserInput } from './users.dto';

// Sistem tidak boleh kehilangan admin terakhirnya: tanpa admin, tidak ada
// yang bisa membuat akun baru selain lewat seed di server.
async function assertNotLastAdmin(tx: Prisma.TransactionClient, userId: string) {
  const admins = await tx.users.count({ where: { role: 'admin', id: { not: userId } } });
  if (admins === 0) throw httpError(409, 'Cannot remove the last admin.');
}

async function assertUniqueEmail(tx: Prisma.TransactionClient, email: string, exceptId?: string) {
  const existing = await tx.users.findFirst({
    where: { email, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  });
  if (existing) throw httpError(409, 'Email is already registered.', 'email');
}

export const UsersService = {
  async findAll(query: Record<string, unknown>) {
    const { page, perPage, skip } = parsePagination(query);

    const where: Prisma.usersWhereInput = {};
    if (typeof query.search === 'string' && query.search) {
      where.OR = [{ name: { contains: query.search } }, { email: { contains: query.search } }];
    }

    const [rows, total] = await prisma.$transaction([
      prisma.users.findMany({ where, skip, take: perPage, orderBy: { name: 'asc' } }),
      prisma.users.count({ where }),
    ]);
    return { data: rows.map(formatUser), meta: buildMeta(total, page, perPage) };
  },

  async findById(id: string) {
    const row = await prisma.users.findUnique({ where: { id } });
    if (!row) throw notFound('User');
    return formatUser(row);
  },

  async create(input: CreateUserInput) {
    return prisma.$transaction(async (tx) => {
      await assertUniqueEmail(tx, input.email);
      const row = await tx.users.create({
        data: { ...input, password: await argon2.hash(input.password) },
      });
      return formatUser(row);
    });
  },

  async update(id: string, input: UpdateUserInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.users.findUnique({ where: { id } });
      if (!existing) throw notFound('User');
      if (input.email !== undefined) await assertUniqueEmail(tx, input.email, id);
      if (input.role === 'staff' && existing.role === 'admin') await assertNotLastAdmin(tx, id);

      // Reset password atau perubahan peran mencabut semua token akun itu,
      // supaya hak lama tidak tetap berlaku sampai token kedaluwarsa.
      const revoke = input.password !== undefined || (input.role !== undefined && input.role !== existing.role);

      const row = await tx.users.update({
        where: { id },
        data: {
          ...(input.email !== undefined && { email: input.email }),
          ...(input.name  !== undefined && { name: input.name }),
          ...(input.role  !== undefined && { role: input.role }),
          ...(input.password !== undefined && { password: await argon2.hash(input.password) }),
          ...(revoke && { tokenVersion: { increment: 1 } }),
        },
      });
      return formatUser(row);
    });
  },

  async delete(id: string, actorId: string) {
    if (id === actorId) throw httpError(409, 'You cannot delete your own account.');
    await prisma.$transaction(async (tx) => {
      const existing = await tx.users.findUnique({ where: { id }, select: { role: true } });
      if (!existing) throw notFound('User');
      if (existing.role === 'admin') await assertNotLastAdmin(tx, id);
      await tx.users.delete({ where: { id } });
    });
  },
};
