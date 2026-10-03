import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { strParam } from '../../utils/validators';
import { OfficesService } from './offices.service';
import { CreateOfficeDto, UpdateOfficeDto } from './offices.dto';

const code = (req: Request) => strParam(req.params.code, 'Office');

export const OfficesController = {
  index: asyncHandler(async (req: Request, res: Response) => {
    const { data, meta } = await OfficesService.findAll(req.query as Record<string, unknown>);
    ApiResponse.paginated(res, data, meta, 'Office list');
  }),

  show: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.success(res, await OfficesService.findById(code(req)));
  }),

  store: asyncHandler(async (req: Request, res: Response) => {
    const input = CreateOfficeDto.parse(req.body);
    ApiResponse.created(res, await OfficesService.create(input), 'Office created successfully.');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = UpdateOfficeDto.parse(req.body);
    ApiResponse.success(res, await OfficesService.update(code(req), input), 'Office updated successfully.');
  }),

  destroy: asyncHandler(async (req: Request, res: Response) => {
    await OfficesService.delete(code(req));
    ApiResponse.noContent(res, 'Office deleted successfully.');
  }),
};
