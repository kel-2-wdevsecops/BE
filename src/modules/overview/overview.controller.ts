import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { OverviewQuery } from './overview.dto';
import { OverviewService } from './overview.service';

export const OverviewController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.cached(res, await OverviewService.get(OverviewQuery.parse(req.query)), 'Sales overview');
  }),
};
