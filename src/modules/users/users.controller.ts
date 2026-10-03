import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

export const UsersController = {
  index: asyncHandler(async (req: Request, res: Response) => {
    const { data, meta } = await UsersService.findAll(req.query as Record<string, unknown>);
    ApiResponse.paginated(res, data, meta, 'User list');
  }),

  show: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.success(res, await UsersService.findById(req.params.id));
  }),

  store: asyncHandler(async (req: Request, res: Response) => {
    const input = CreateUserDto.parse(req.body);
    ApiResponse.created(res, await UsersService.create(input), 'User created successfully.');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = UpdateUserDto.parse(req.body);
    ApiResponse.success(res, await UsersService.update(req.params.id, input), 'User updated successfully.');
  }),

  destroy: asyncHandler(async (req: Request, res: Response) => {
    await UsersService.delete(req.params.id, req.userId!);
    ApiResponse.noContent(res, 'User deleted successfully.');
  }),
};
