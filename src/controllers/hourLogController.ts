import { Response } from 'express';
import mongoose from 'mongoose';
import { HourLog, User, Project, Task } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendResponse } from '../utils/response';

export const createHourLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { client, developer, project, task, date, hours, description } = req.body;
console.log("user",req.body)
  // Only developers can create hour logs for themselves
  if (req.user.role === 2) {
    // Developer can only log hours for themselves
    if (developer !== req.user._id.toString()) {
      return sendResponse(res, {
        success: false,
        message: 'Developers can only log hours for themselves',
        statusCode: 403,
        toast: true
      });
    }
    
    // Developers must provide a task
    if (!task) {
      return sendResponse(res, {
        success: false,
        message: 'Developers must log hours against a specific task',
        statusCode: 400,
        toast: true
      });
    }
  } else if (req.user.role !== 0) {
    // Only BA and developers can create hour logs
    return sendResponse(res, {
      success: false,
      message: 'Only BA and developers can create hour logs',
      statusCode: 403,
      toast: true
    });
  }

  // Validate client
  const clientUser = await User.findOne({ _id: client, role: 1 });
  if (!clientUser) {
    return sendResponse(res, {
      success: false,
      message: 'Invalid client ID',
      statusCode: 400,
      toast: true
    });
  }

  // Validate developer
  const developerUser = await User.findOne({ _id: developer, role: 2 });
  if (!developerUser) {
    return sendResponse(res, {
      success: false,
      message: 'Invalid developer ID',
      statusCode: 400,
      toast: true
    });
  }

  // Validate project
  const projectDoc = await Project.findById(project);
  if (!projectDoc) {
    return sendResponse(res, {
      success: false,
      message: 'Invalid project ID',
      statusCode: 400,
      toast: true
    });
  }

  // Check if developer is assigned to the project
  if (!projectDoc.developers.includes(developer as any)) {
    return sendResponse(res, {
      success: false,
      message: 'Developer is not assigned to this project',
      statusCode: 400,
      toast: true
    });
  }

  // Validate task if provided
  if (task) {
    const taskDoc = await Task.findById(task);
    if (!taskDoc) {
      return sendResponse(res, {
        success: false,
        message: 'Invalid task ID',
        statusCode: 400,
        toast: true
      });
    }

    // Check if task belongs to the project
    if (taskDoc.project.toString() !== project) {
      return sendResponse(res, {
        success: false,
        message: 'Task does not belong to the selected project',
        statusCode: 400,
        toast: true
      });
    }

    // Check if developer is assigned to the task
    if (!taskDoc.assignedTo.some((dev: any) => dev.toString() === developer)) {
      return sendResponse(res, {
        success: false,
        message: 'Developer is not assigned to this task',
        statusCode: 400,
        toast: true
      });
    }
  }

  const hourLog = await HourLog.create({
    client,
    developer,
    project,
    task: task || undefined,
    date,
    hours,
    description,
    createdBy: req.user._id
  });

  // Update project actual hours
  await Project.findByIdAndUpdate(project, {
    $inc: { actualHours: hours }
  });

  // Update task actual hours if task is provided
  if (task) {
    await Task.findByIdAndUpdate(task, {
      $inc: { actualHours: hours }
    });
  }

  await hourLog.populate(['client', 'developer', 'project', 'task', 'createdBy']);

  return sendResponse(res, {
    success: true,
    message: 'Hour log created successfully',
    statusCode: 201,
    data: { hourLog },
    toast: true
  });
});

export const getHourLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, clientId, developerId, startDate, endDate } = req.query;
  const { projectId } = req.params;
  
  const query: any = {};
  
  // Apply role-based filtering
  if (req.user.role === 1) { // Client can only see their own hour logs
    query.client = req.user._id;
  } else if (req.user.role === 2) { // Developer can only see their own hour logs
    query.developer = req.user._id;
  }
  // BA can see all hour logs
  
  // Apply additional filters
  if (clientId) query.client = clientId;
  if (developerId) query.developer = developerId;
  if (projectId) query.project = projectId;
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate as string);
    if (endDate) query.date.$lte = new Date(endDate as string);
  }

  const hourLogs = await HourLog.find(query)
    .populate(['client', 'developer', 'project', 'createdBy'])
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

export const importHourLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { project, clientName, developerName, hours, date, description } = req.body;
  console.log("????", req.body);
  
  // Only BA can import hour logs
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can import hour logs',
      statusCode: 403,
      toast: true
    });
  }

  try {
    // Find client by name
    const clientUser = await User.findOne({ name: clientName, role: 1 });
    if (!clientUser) {
      return sendResponse(res, {
        success: false,
        message: `Client not found: ${clientName}`,
        statusCode: 400,
        toast: true
      });
    }

    // Find developer by name
    const developerUser = await User.findOne({ name: developerName, role: 2 });
    if (!developerUser) {
      return sendResponse(res, {
        success: false,
        message: `Developer not found: ${developerName}`,
        statusCode: 400,
        toast: true
      });
    }

    // Find or create project using findOneAndUpdate with upsert to avoid race conditions
    let projectDoc = await Project.findOneAndUpdate(
      { 
        name: project, 
        client: clientUser._id 
      },
      {
        $setOnInsert: {
          name: project,
          client: clientUser._id,
          developers: [developerUser._id],
          status: 'active',
          billingType: 'hourly',
          createdBy: req.user._id,
          actualHours: 0
        }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Add developer to project if not already assigned
    if (!projectDoc.developers.some((dev: any) => dev.toString() === developerUser._id.toString())) {
      await Project.findByIdAndUpdate(projectDoc._id, {
        $addToSet: { developers: developerUser._id }
      });
    }

    // Create hour log
    const hourLog = await HourLog.create({
      client: clientUser._id,
      developer: developerUser._id,
      project: projectDoc._id,
      date: new Date(date),
      hours: Number(hours),
      description: description || '',
      createdBy: req.user._id
    });

    // Update project actual hours
    await Project.findByIdAndUpdate(projectDoc._id, {
      $inc: { actualHours: Number(hours) }
    });

    await hourLog.populate(['client', 'developer', 'project', 'createdBy']);

    return sendResponse(res, {
      success: true,
      message: 'Hour log imported successfully',
      statusCode: 201,
      data: { hourLog },
      toast: false // Don't show toast for each import
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return sendResponse(res, {
      success: false,
      message: error.message || 'Failed to import hour log',
      statusCode: 500,
      toast: true
    });
  }
});
