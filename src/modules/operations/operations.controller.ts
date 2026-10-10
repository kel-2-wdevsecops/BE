import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { OperationsQuery } from './operations.dto';
import { OperationsService } from './operations.service';

export const OperationsController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    ApiResponse.cached(res, await OperationsService.get(OperationsQuery.parse(req.query)), 'Order operations');
  }),
};
