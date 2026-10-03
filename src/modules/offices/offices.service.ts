import { prisma } from '../../config/database';
import type { Prisma } from '../../generated/prisma/client';
import { buildMeta } from '../../utils/apiResponse';
import { parsePagination } from '../../utils/asyncHandler';
import { httpError, notFound } from '../../utils/httpError';
import { searchQuery } from '../../utils/validators';
import type { CreateOfficeInput, UpdateOfficeInput } from './offices.dto';

const OFFICE_INCLUDE = { _count: { select: { employees: true } } } as const;

type OfficeRow = Prisma.officesGetPayload<{ include: typeof OFFICE_INCLUDE }>;

function formatOffice({ _count, ...rest }: OfficeRow) {
  return { ...rest, employeeCount: _count.employees };
}

export const OfficesService = {
  async findAll(query: Record<string, unknown>) {
    const { page, perPage, skip } = parsePagination(query);

    const where: Prisma.officesWhereInput = {};
    if (typeof query.country === 'string' && query.country) where.country = query.country;
    const search = searchQuery(query);
    if (search) where.OR = [{ city: { contains: search } }, { officeCode: { contains: search } }];

    const [rows, total] = await prisma.$transaction([
      prisma.offices.findMany({ where, skip, take: perPage, orderBy: { officeCode: 'asc' }, include: OFFICE_INCLUDE }),
      prisma.offices.count({ where }),
    ]);
    return { data: rows.map(formatOffice), meta: buildMeta(total, page, perPage) };
  },

  async findById(officeCode: string) {
    const row = await prisma.offices.findUnique({ where: { officeCode }, include: OFFICE_INCLUDE });
    if (!row) throw notFound('Office');
    return formatOffice(row);
  },

  async create(input: CreateOfficeInput) {
    const exists = await prisma.offices.findUnique({ where: { officeCode: input.officeCode }, select: { officeCode: true } });
    if (exists) throw httpError(409, 'Office code is already used.', 'officeCode');
    return formatOffice(await prisma.offices.create({ data: input, include: OFFICE_INCLUDE }));
  },

  async update(officeCode: string, input: UpdateOfficeInput) {
    await this.findById(officeCode);
    return formatOffice(await prisma.offices.update({ where: { officeCode }, data: input, include: OFFICE_INCLUDE }));
  },

  // Ditolak (409) selama masih ada karyawan di kantor ini — FK RESTRICT.
  async delete(officeCode: string) {
    const office = await this.findById(officeCode);
    if (office.employeeCount > 0) {
      throw httpError(409, `Office still has ${office.employeeCount} employee(s).`);
    }
    await prisma.offices.delete({ where: { officeCode } });
  },
};
