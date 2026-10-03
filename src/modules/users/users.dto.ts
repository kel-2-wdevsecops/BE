import { z } from 'zod';
import { PasswordSchema } from '../auth/auth.dto';

const UserFields = z.object({
  email:    z.string().trim().toLowerCase().email('Invalid email format').max(100),
  name:     z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  password: PasswordSchema,
  role:     z.enum(['admin', 'staff']),
});

export const CreateUserDto = UserFields.extend({ role: UserFields.shape.role.default('staff') });

// Dibangun dari UserFields, BUKAN CreateUserDto.partial(): di zod 4 `.default()`
// tetap berlaku di dalam `.partial()`, sehingga update tanpa `role` akan diam-
// diam mengirim role 'staff' (admin turun peran). Lihat users.dto.test.ts.
// `password` di sini = reset oleh admin; semua sesi akun itu ikut dicabut.
export const UpdateUserDto = UserFields.partial();

export type CreateUserInput = z.infer<typeof CreateUserDto>;
export type UpdateUserInput = z.infer<typeof UpdateUserDto>;
