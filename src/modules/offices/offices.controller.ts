import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { OfficesService } from './offices.service';
import { CreateOfficeDto, UpdateOfficeDto } from './offices.dto';

export const OfficesController = {
  index: asyncHandler(async (req: Request, res: Response) => {
    const { data, meta } = await OfficesService.findAll(req.query as Record<string, unknown>);
    ApiResponse.paginated(res, data, meta, 'Office list');
  }),

  show: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.success(res, await OfficesService.findById(req.params.code));
  }),

  store: asyncHandler(async (req: Request, res: Response) => {
    const input = CreateOfficeDto.parse(req.body);
    ApiResponse.created(res, await OfficesService.create(input), 'Office created successfully.');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = UpdateOfficeDto.parse(req.body);
    ApiResponse.success(res, await OfficesService.update(req.params.code, input), 'Office updated successfully.');
  }),

  destroy: asyncHandler(async (req: Request, res: Response) => {
    await OfficesService.delete(req.params.code);
    ApiResponse.noContent(res, 'Office deleted successfully.');
  }),
};
