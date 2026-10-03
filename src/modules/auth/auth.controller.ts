import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthService, formatUser, revokeUserTokens } from './auth.service';
import { LoginDto, RefreshDto, ChangePasswordDto } from './auth.dto';

export const AuthController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const input            = LoginDto.parse(req.body);
    const { user, tokens } = await AuthService.login(input);
    ApiResponse.success(res, { user, ...tokens }, 'Login successful');
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refresh_token } = RefreshDto.parse(req.body);
    const result = await AuthService.refresh(refresh_token);
    ApiResponse.success(res, result, 'Token refreshed successfully');
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.success(res, formatUser(req.user!));
  }),

  // Mencabut SEMUA token user ini (semua perangkat) lewat tokenVersion —
  // JWT stateless tidak bisa dicabut satu per satu tanpa tabel denylist.
  logout: asyncHandler(async (req: Request, res: Response) => {
    await revokeUserTokens(req.userId!);
    ApiResponse.success(res, null, 'Logout successful.');
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { current_password, new_password } = ChangePasswordDto.parse(req.body);
    const tokens = await AuthService.changePassword(req.userId!, current_password, new_password);
    ApiResponse.success(res, tokens, 'Password changed successfully.');
  }),
};
