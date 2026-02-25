import { Response } from 'express';
import { Project, User, HourLog } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendResponse } from '../utils/response';

export const createProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, client, developers, status, startDate, endDate, estimatedHours, hourlyRate, billingType } = req.body;
  // Verify client exists and is a client user
  const clientUser = await User.findById(client);
  if (!clientUser || clientUser.role !== 1) {
    return sendResponse(res, {
      success: false,
      message: 'Invalid client selected',
      statusCode: 400
    });
  }

  // Verify all developers exist and are developer users
  if (developers && developers.length > 0) {
    const developerUsers = await User.find({ _id: { $in: developers }, role: 2 });
    if (developerUsers.length !== developers.length) {
      return sendResponse(res, {
        success: false,
        message: 'Invalid developer(s) selected',
        statusCode: 400
      });
    }
  }

  const project = await Project.create({
    name,
    description,
    client,
    developers: developers || [],
    status: status || 'Planning',
    startDate,
    endDate,
    estimatedHours,
    hourlyRate,
    billingType: billingType || 'Hourly',
    createdBy: req.user._id
  });

  const populatedProject = await Project.findById(project._id)
    .populate('client', 'name email')
    .populate('developers', 'name email')
    .populate('createdBy', 'name email');

  return sendResponse(res, {
    success: true,
    message: 'Project created successfully',
    data: { project: populatedProject },
    statusCode: 201
  });
});

export const getProjects = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, status, client } = req.query;
  const userRole = req.user.role;

  let query: any = {};

  // BA can see all projects
  // Client can only see their own projects
  // Developer can only see projects they're assigned to
  if (userRole === 1) { // Client
    query.client = req.user._id;
  } else if (userRole === 2) { // Developer
    query.developers = { $in: [req.user._id] };
  }

  if (status) {
    query.status = status;
  }

  if (client) {
    query.client = client;
  }

  const projects = await Project.find(query)
    .populate('client', 'name email')
    .populate('developers', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(Number(limit) * Number(page))
    .skip((Number(page) - 1) * Number(limit));

  // Fetch actual logged hours for each project
  const projectsWithHours = await Promise.all(
    projects.map(async (project) => {
      const hourLogs = await HourLog.find({ project: project._id });
      const actualHours = hourLogs.reduce((total, log) => total + log.hours, 0);
      
      return {
        ...project.toObject(),
        actualHours,
        hourLogsCount: hourLogs.length
      };
    })
  );
 
  const total = await Project.countDocuments(query);

  return sendResponse(res, {
    success: true,
    data: {
      projects: projectsWithHours,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

export const getProjectById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userRole = req.user.role;

  let query: any = { _id: id };

  // Apply role-based filtering
  if (userRole === 1) { // Client
    query.client = req.user._id;
  } else if (userRole === 2) { // Developer
    query.developers = { $in: [req.user._id] };
  }

  const project = await Project.findOne(query)
    .populate('client', 'name email')
    .populate('developers', 'name email')
    .populate('createdBy', 'name email');

  if (!project) {
    return sendResponse(res, {
      success: false,
      message: 'Project not found',
      statusCode: 404
    });
  }

  return sendResponse(res, {
    success: true,
    data: { project }
  });
});

export const updateProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, client, developers, status, startDate, endDate, estimatedHours, hourlyRate, billingType } = req.body;

  // Find project and verify access
  const project = await Project.findById(id);
  if (!project) {
    return sendResponse(res, {
      success: false,
      message: 'Project not found',
      statusCode: 404
    });
  }

  // Only BA can update projects
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can update projects',
      statusCode: 403
    });
  }

  // Verify client if provided
  if (client && client !== project.client.toString()) {
    const clientUser = await User.findById(client);
    if (!clientUser || clientUser.role !== 1) {
      return sendResponse(res, {
        success: false,
        message: 'Invalid client selected',
        statusCode: 400
      });
    }
  }

  // Verify developers if provided
  if (developers && developers.length > 0) {
    const developerUsers = await User.find({ _id: { $in: developers }, role: 2 });
    if (developerUsers.length !== developers.length) {
      return sendResponse(res, {
        success: false,
        message: 'Invalid developer(s) selected',
        statusCode: 400
      });
    }
  }

  const updatedProject = await Project.findByIdAndUpdate(
    id,
    {
      name,
      description,
      client,
      developers,
      status,
      startDate,
      endDate,
      estimatedHours,
      hourlyRate,
      billingType
    },
    { new: true, runValidators: true }
  )
    .populate('client', 'name email')
    .populate('developers', 'name email')
    .populate('createdBy', 'name email');

  return sendResponse(res, {
    success: true,
    message: 'Project updated successfully',
    data: { project: updatedProject }
  });
});

export const deleteProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Find project and verify access
  const project = await Project.findById(id);
  if (!project) {
    return sendResponse(res, {
      success: false,
      message: 'Project not found',
      statusCode: 404
    });
  }

  // Only BA can delete projects
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can delete projects',
      statusCode: 403
    });
  }

  await Project.findByIdAndDelete(id);

  return sendResponse(res, {
    success: true,
    message: 'Project deleted successfully'
  });
});

export const getProjectStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userRole = req.user.role;

  let matchStage: any = {};

  // Apply role-based filtering
  if (userRole === 1) { // Client
    matchStage.client = req.user._id;
  } else if (userRole === 2) { // Developer
    matchStage.developers = { $in: [req.user._id] };
  }

  const stats = await Project.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimated: { $sum: '$estimatedHours' },
        totalActual: { $sum: '$actualHours' }
      }
    }
  ]);

  const totalProjects = await Project.countDocuments(matchStage);

  return sendResponse(res, {
    success: true,
    data: {
      stats,
      totalProjects
    }
  });
});
