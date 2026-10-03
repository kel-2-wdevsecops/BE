import { z } from 'zod';
import { PasswordSchema } from '../auth/auth.dto';

export const CreateUserDto = z.object({
  email:    z.string().trim().toLowerCase().email('Invalid email format').max(100),
  name:     z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  password: PasswordSchema,
  role:     z.enum(['admin', 'staff']).default('staff'),
});

// `password` di sini = reset oleh admin; semua sesi akun itu ikut dicabut.
export const UpdateUserDto = CreateUserDto.partial();

export type CreateUserInput = z.infer<typeof CreateUserDto>;
export type UpdateUserInput = z.infer<typeof UpdateUserDto>;
