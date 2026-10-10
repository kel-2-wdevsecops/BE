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

  /**
   * Respons sukses endpoint dashboard: data dump tidak berubah, jadi browser
   * dan Cloudflare boleh memakai ulang 5 menit. Error lewat error middleware,
   * jadi tidak pernah membawa header ini.
   */
  cached<T>(res: Response, data: T, message = 'Success'): Response {
    res.set('Cache-Control', 'public, max-age=300');
    return send(res, 200, { success: true, message, data });
  },

  error(res: Response, message: string, status = 400, errors?: unknown): Response {
    return send(res, status, { success: false, message, data: null, errors });
  },

  notFound(res: Response, message = 'Data not found'): Response {
    return send(res, 404, { success: false, message, data: null });
  },
};
