import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { FiltersQuery } from './filters.dto';
import { FiltersService } from './filters.service';

export const FiltersController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.cached(res, await FiltersService.get(FiltersQuery.parse(req.query)), 'Dashboard filters');
  }),
};
