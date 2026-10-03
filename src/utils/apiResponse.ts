import { Response } from 'express';

export interface ApiPayload<T> {
  success: boolean;
  message: string;
  data:    T | null;
  errors?: unknown;
}

function send<T>(
  res:     Response,
  status:  number,
  payload: ApiPayload<T>,
): Response {
  return res.status(status).json(payload);
}

export const ApiResponse = {
  success<T>(res: Response, data: T, message = 'Success', status = 200): Response {
    return send(res, status, { success: true, message, data });
  },

  error(res: Response, message: string, status = 400, errors?: unknown): Response {
    return send(res, status, { success: false, message, data: null, errors });
  },

  notFound(res: Response, message = 'Data not found'): Response {
    return send(res, 404, { success: false, message, data: null });
  },
};
