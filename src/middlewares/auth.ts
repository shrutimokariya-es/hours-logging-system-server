import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { envObj } from '../config/envConfig';
import { sendResponse } from '../utils/response';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return sendResponse(res, {
        success: false,
        message: 'Access denied. No token provided.',
        statusCode: 401
      });
    }

    const jwtSecret =envObj.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return sendResponse(res, {
        success: false,
        message: 'Invalid token. User not found.',
        statusCode: 401
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return sendResponse(res, {
        success: false,
        message: 'Invalid token.',
        statusCode: 401
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return sendResponse(res, {
        success: false,
        message: 'Token expired.',
        statusCode: 401
      });
    }

    console.error('Auth middleware error:', error);
    return sendResponse(res, {
      success: false,
      message: 'Internal server error during authentication.',
      statusCode: 500
    });
  }
};

export const authorize = (roles: number[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendResponse(res, {
        success: false,
        message: 'Access denied. User not authenticated.',
        statusCode: 401
      });
    }

    if (!roles.includes(req.user.role)) {
      return sendResponse(res, {
        success: false,
        message: 'Access denied. Insufficient permissions.',
        statusCode: 403
      });
    }

    return next();
  };
};
