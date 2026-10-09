import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { GrowthQuery } from './growth.dto';
import { GrowthService } from './growth.service';

export const GrowthController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.cached(res, await GrowthService.get(GrowthQuery.parse(req.query)), 'Sales growth');
  }),
};
