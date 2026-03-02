import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { analyticsService } from '../services/analyticsService';
import { sendResponse } from '../utils/response';

export const getPredictiveInsights = async (req: AuthRequest, res: Response) => {
  try {
    console.log(">>>>>>>>>>>>",req.query)
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { startDate, endDate } = req.query;
    
    if (!userId || userRole === undefined) {
      return sendResponse(res, {
        success: false,
        message: 'User authentication required',
        statusCode: 401
      });
    }

    const insights = await analyticsService.getPredictiveInsights(
      userRole,
      userId,
      startDate as string,
      endDate as string
    );

    return sendResponse(res, {
      success: true,
      message: 'Predictive insights retrieved successfully',
      data: insights
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return sendResponse(res, {
      success: false,
      message: 'Failed to fetch predictive insights',
      statusCode: 500,
      error: error.message
    });
  }
};
