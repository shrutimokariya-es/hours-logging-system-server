import { envObj } from '../config/envConfig';
import { Response } from 'express';

interface ResponseData {
  success?: boolean;
  message?: string;
  data?: any;
  error?: string;
  errors?: any;
  statusCode?: number;
  toastMessageFlag?: boolean;
  toast?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Common response function for all API endpoints
 * Provides consistent response format across entire application
 */
export const sendResponse = (
  res: Response,
  options: ResponseData
): Response => {
  const {
    success = true,
    message = 'Success',
    data,
    error,
    statusCode = 200,
    toastMessageFlag = false,
    toast = toastMessageFlag,
    pagination
  } = options;

  const responseData: any = {
    success,
    message,
    toastMessageFlag,
    toast,
    ...(data !== undefined && { data }),
    ...(pagination && { pagination }),
    ...(error && envObj.NODE_ENV === 'development' && { error })
  };

  return res.status(statusCode).json(responseData);
};
