import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { dashboardService } from '../services/dashboardService';
import { sendResponse } from '../utils/response';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { startDate, endDate } = req.query;
    
    if (!userId) {
      return sendResponse(res, {
        success: false,
        message: 'User authentication required',
        statusCode: 401
      });
    }

    const dashboardData = await dashboardService.getDashboardSummary(
      userId, 
      userRole,
      startDate as string,
      endDate as string
    );

    return sendResponse(res, {
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: dashboardData
    });
  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    return sendResponse(res, {
      success: false,
      message: 'Failed to fetch dashboard summary',
      statusCode: 500,
      error: error.message
    });
  }
};
