import { describe, expect, it } from 'vitest';
import { CreateUserDto, UpdateUserDto } from './users.dto';

describe('CreateUserDto', () => {
  it('role default staff dan email dinormalisasi', () => {
    const input = CreateUserDto.parse({ email: ' Admin@Axon.ID ', name: 'Admin', password: '12345678' });
    expect(input).toMatchObject({ email: 'admin@axon.id', role: 'staff' });
  });
});

describe('UpdateUserDto', () => {
  // Regresi zod 4: `.default()` ikut berlaku di dalam `.partial()`, sehingga
  // update nama saja pernah menurunkan admin menjadi staff.
  it('tidak menambahkan field yang tidak dikirim', () => {
    expect(UpdateUserDto.parse({ name: 'Nama Baru' })).toEqual({ name: 'Nama Baru' });
    expect(UpdateUserDto.parse({})).toEqual({});
  });

  it('tetap memvalidasi field yang dikirim', () => {
    expect(UpdateUserDto.safeParse({ role: 'owner' }).success).toBe(false);
    expect(UpdateUserDto.safeParse({ password: 'pendek' }).success).toBe(false);
  });
});
