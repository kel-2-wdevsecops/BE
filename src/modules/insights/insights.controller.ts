import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { InsightsQuery } from './insights.dto';
import { InsightsService } from './insights.service';

export const InsightsController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.cached(res, await InsightsService.get(InsightsQuery.parse(req.query)), 'Insights');
  }),
};
