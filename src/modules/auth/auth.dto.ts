import { z } from 'zod';

// Batas atas 128 mencegah hashing input raksasa; minimal 8 mengikuti
// rekomendasi NIST SP 800-63B.
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const LoginDto = z.object({
  email:    z.string().trim().email('Invalid email format').max(100),
  password: z.string().min(1, 'Password is required').max(128),
});

export const ChangePasswordDto = z.object({
  current_password: z.string().min(1).max(128),
  new_password:     PasswordSchema,
});

export const RefreshDto = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required').max(4096),
});

export type LoginInput = z.infer<typeof LoginDto>;
