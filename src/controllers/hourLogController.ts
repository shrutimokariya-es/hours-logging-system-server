import { Response } from 'express';
import mongoose from 'mongoose';
import { HourLog, User } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendResponse } from '../utils/response';

export const createHourLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  console.log(req.body);
  const { client, developer, date, hours, description } = req.body;

  const clientUser = await User.findOne({ _id: client, role: 1 }); // Client role
  const developerUser = await User.findOne({ _id: developer, role: 2 }); // Developer role

  if (!clientUser || !developerUser) {
    return sendResponse(res, {
      success: false,
      message: 'Invalid client or developer ID',
      statusCode: 400
    });
  }
console.log("client", client);
console.log("developer", developer);
console.log("date", date);
console.log("hours", hours);
console.log("description", description);
  const hourLog = await HourLog.create({
    client,
    developer,
    date,
    hours,
    description,
    createdBy: req.user._id
  });

  await hourLog.populate(['client', 'developer', 'createdBy']);

  return sendResponse(res, {
    success: true,
    message: 'Hour log created successfully',
    statusCode: 201,
    data: { hourLog }
  });
});

export const getHourLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, clientId, developerId, startDate, endDate } = req.query;
  
  const query: any = {};
  
  if (clientId) query.client = clientId;
  if (developerId) query.developer = developerId;
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate as string);
    if (endDate) query.date.$lte = new Date(endDate as string);
  }

  const hourLogs = await HourLog.find(query)
    .populate(['client', 'developer', 'createdBy'])
    .sort({ date: -1 })
    .limit(Number(limit) * Number(page))
    .skip((Number(page) - 1) * Number(limit));

  const total = await HourLog.countDocuments(query);

  return sendResponse(res, {
    success: true,
    data: {
      hourLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

export const getReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, clientId, developerId, reportType } = req.query;
  
  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate as string);
    if (endDate) matchStage.date.$lte = new Date(endDate as string);
  }
  
  if (clientId) matchStage.client = new mongoose.Types.ObjectId(clientId as string);
  if (developerId) matchStage.developer = new mongoose.Types.ObjectId(developerId as string);

  // ✅ Total hours per client
  const clientBreakdown = await HourLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$client',
        totalHours: { $sum: '$hours' },
        totalLogs: { $sum: 1 },
        avgHoursPerLog: { $avg: '$hours' }
      }
    },
    { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'clientInfo' } },
    { $unwind: '$clientInfo' },
    {
      $project: {
        clientId: '$_id',
        clientName: '$clientInfo.name',
        clientEmail: '$clientInfo.companyEmail',
        totalHours: 1,
        totalLogs: 1,
        avgHoursPerLog: 1
      }
    },
    { $sort: { totalHours: -1 } }
  ]);

  // ✅ Total hours per developer
  const developerBreakdown = await HourLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$developer',
        totalHours: { $sum: '$hours' },
        totalLogs: { $sum: 1 },
        avgHoursPerLog: { $avg: '$hours' }
      }
    },
    { $lookup: { from: 'developers', localField: '_id', foreignField: '_id', as: 'developerInfo' } },
    { $unwind: '$developerInfo' },
    {
      $project: {
        developerId: '$_id',
        developerName: '$developerInfo.name',
        developerEmail: '$developerInfo.email',
        hourlyRate: '$developerInfo.hourlyRate',
        totalHours: 1,
        totalLogs: 1,
        avgHoursPerLog: 1,
        totalEarnings: { $multiply: ['$developerInfo.hourlyRate', { $sum: '$hours' }] }
      }
    },
    { $sort: { totalHours: -1 } }
  ]);

  // ✅ Total hours for current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const currentMonthReport = await HourLog.aggregate([
    {
      $match: {
        date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        ...(clientId && { client: new mongoose.Types.ObjectId(clientId as string) }),
        ...(developerId && { developer: new mongoose.Types.ObjectId(developerId as string) })
      }
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
        totalLogs: { $sum: 1 },
        avgHoursPerLog: { $avg: '$hours' },
        uniqueClients: { $addToSet: '$client' },
        uniqueDevelopers: { $addToSet: '$developer' }
      }
    },
    {
      $project: {
        totalHours: 1,
        totalLogs: 1,
        avgHoursPerLog: 1,
        uniqueClientsCount: { $size: '$uniqueClients' },
        uniqueDevelopersCount: { $size: '$uniqueDevelopers' },
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      }
    }
  ]);

  // ✅ Date range filter report (daily breakdown)
  const dailyBreakdown = await HourLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        totalHours: { $sum: '$hours' },
        totalLogs: { $sum: 1 },
        uniqueClients: { $addToSet: '$client' },
        uniqueDevelopers: { $addToSet: '$developer' }
      }
    },
    {
      $project: {
        date: '$_id',
        totalHours: 1,
        totalLogs: 1,
        uniqueClientsCount: { $size: '$uniqueClients' },
        uniqueDevelopersCount: { $size: '$uniqueDevelopers' }
      }
    },
    { $sort: { date: 1 } }
  ]);

  // Overall summary
  const overallSummary = await HourLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
        totalLogs: { $sum: 1 },
        avgHoursPerLog: { $avg: '$hours' },
        uniqueClients: { $addToSet: '$client' },
        uniqueDevelopers: { $addToSet: '$developer' },
        dateRange: { $push: '$date' }
      }
    },
    {
      $project: {
        totalHours: 1,
        totalLogs: 1,
        avgHoursPerLog: 1,
        uniqueClientsCount: { $size: '$uniqueClients' },
        uniqueDevelopersCount: { $size: '$uniqueDevelopers' },
        dateRange: {
          start: { $min: '$dateRange' },
          end: { $max: '$dateRange' }
        }
      }
    }
  ]);

  // ✅ Clean JSON response ready for frontend charts
  const response = {
    success: true,
    data: {
      summary: overallSummary[0] || { 
        totalHours: 0, 
        totalLogs: 0, 
        avgHoursPerLog: 0,
        uniqueClientsCount: 0,
        uniqueDevelopersCount: 0
      },
      currentMonth: currentMonthReport[0] || {
        totalHours: 0,
        totalLogs: 0,
        avgHoursPerLog: 0,
        uniqueClientsCount: 0,
        uniqueDevelopersCount: 0,
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      },
      clientBreakdown,    // ✅ Total hours per client
      developerBreakdown, // ✅ Total hours per developer
      dailyBreakdown     // ✅ Date range filter report
    }
  };

  // Return specific report type if requested
  if (reportType) {
    switch (reportType) {
      case 'clients':
        return sendResponse(res, {
          success: true,
          data: clientBreakdown
        });
      case 'developers':
        return sendResponse(res, {
          success: true,
          data: developerBreakdown
        });
      case 'current-month':
        return sendResponse(res, {
          success: true,
          data: currentMonthReport[0] || {
            totalHours: 0,
            totalLogs: 0,
            avgHoursPerLog: 0,
            uniqueClientsCount: 0,
            uniqueDevelopersCount: 0,
            month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
          }
        });
      case 'daily':
        return sendResponse(res, {
          success: true,
          data: dailyBreakdown
        });
      default:
        return sendResponse(res, response);
    }
  }

  return sendResponse(res, response);
});
