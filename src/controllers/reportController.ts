import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { reportService } from '../services/reportService';

// Generate new report
export const generateReport = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { title, type, startDate, endDate } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, start date, and end date are required'
      });
    }

    const reportData = {
      title,
      type: type || 'custom',
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };

    const report = await reportService.generateReport(reportData);

    return res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: {
        report
      }
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate report'
    });
  }
};

// Get client hours with project breakdown
export const getClientHours = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, startDate, endDate } = req.query;
console.log(">>",req.query)
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }

    const result = await reportService.getClientProjectHours(
      clientId as string,
      startDate as string,
      endDate as string
    );

    return res.status(200).json({
      success: true,
      message: 'Client hours retrieved successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching client hours:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch client hours'
    });
  }
};

// Get all reports
export const getAllReports = async (req: Request, res: Response): Promise<Response> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    const status = req.query.status as string;

    const result = await reportService.getAllReports(page, limit, type, status);

    return res.json({
      success: true,
      message: 'Reports retrieved successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reports'
    });
  }
};

// Get report by ID
export const getReportById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const report = await reportService.getReportById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    return res.json({
      success: true,
      message: 'Report retrieved successfully',
      data: { report }
    });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch report'
    });
  }
};

// Delete report
export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await reportService.deleteReport(id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete report'
    });
  }
};

// Get report statistics
export const getReportStats = async (req: Request, res: Response) => {
  try {
    const stats = await reportService.getReportStats();

    res.json({
      success: true,
      message: 'Report statistics retrieved successfully',
      data: { stats }
    });
  } catch (error: any) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch report statistics'
    });
  }
};

// Get client hours data
export const getClientHoursData = async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'monthly';
    const clientId = req.query.clientId as string;
    
    const clientHours = await reportService.getClientHours(period, clientId);
console.log("!!!!!!",clientId,period)
    res.json({
      success: true,
      message: 'Client hours retrieved successfully',
      data: { clientHours }
    });
  } catch (error: any) {
    console.error('Error fetching client hours:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch client hours'
    });
  }
};

// Get developer hours data
export const getDeveloperHours = async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'monthly';
    const developerId = req.query.developerId as string;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;
    
    const developerHours = await reportService.getDeveloperHours(period, developerId, userRole, userId);

    res.json({
      success: true,
      message: 'Developer hours retrieved successfully',
      data: { developerHours }
    });
  } catch (error: any) {
    console.error('Error fetching developer hours:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch developer hours'
    });
  }
};

// Get combined hours summary
export const getHoursSummary = async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'monthly';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;
    
    const summary = await reportService.getHoursSummary(period, startDate, endDate, userRole, userId);

    res.json({
      success: true,
      message: 'Hours summary retrieved successfully',
      data: { summary }
    });
  } catch (error: any) {
    console.error('Error fetching hours summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch hours summary'
    });
  }
};
