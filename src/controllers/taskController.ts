import { Response } from 'express';
import { Task, Project, User, HourLog } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendResponse } from '../utils/response';

export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, project, assignedTo, status, priority, estimatedHours, startDate, dueDate } = req.body;

  // Verify project exists
  const projectDoc = await Project.findById(project);
  if (!projectDoc) {
    return sendResponse(res, {
      success: false,
      message: 'Project not found',
      statusCode: 404,
      toast:true,
      toastMessageFlag:true
    });
  }

  // Only BA can create tasks
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can create tasks',
      statusCode: 403,
      toast:true,
      toastMessageFlag:true
    });
  }

  // Verify assigned developers are part of the project
  if (assignedTo && assignedTo.length > 0) {
    const projectDeveloperIds = projectDoc.developers.map(d => d.toString());
    const invalidDevelopers = assignedTo.filter((devId: string) => !projectDeveloperIds.includes(devId));
    
    if (invalidDevelopers.length > 0) {
      return sendResponse(res, {
        success: false,
        message: 'Assigned developers must be part of the project',
        statusCode: 400,
      toast:true,
      toastMessageFlag:true
      });
    }
  }

  const task = await Task.create({
    title,
    description,
    project,
    assignedTo: assignedTo || [],
    status: status || 'Todo',
    priority: priority || 'Medium',
    estimatedHours,
    startDate,
    dueDate,
    createdBy: req.user._id
  });

  const populatedTask = await Task.findById(task._id)
    .populate('project', 'name')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  return sendResponse(res, {
    success: true,
    message: 'Task created successfully',
    data: { task: populatedTask },
    statusCode: 201,
      toast:true,
      toastMessageFlag:true
  });
});

export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 50, status, priority, project } = req.query;
  const userRole = req.user.role;

  let query: any = {};

  // Filter by project if provided
  if (project) {
    query.project = project;
  }

  // BA can see all tasks
  // Client can see tasks in their projects
  // Developer can see tasks assigned to them
  if (userRole === 1) { // Client
    const clientProjects = await Project.find({ client: req.user._id }).select('_id');
    const projectIds = clientProjects.map(p => p._id);
    query.project = { $in: projectIds };
  } else if (userRole === 2) { // Developer
    query.assignedTo = { $in: [req.user._id] };
  }

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  const tasks = await Task.find(query)
    .populate('project', 'name client')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(Number(limit) * Number(page))
    .skip((Number(page) - 1) * Number(limit));

  // Fetch actual logged hours for each task
  const tasksWithHours = await Promise.all(
    tasks.map(async (task) => {
      const hourLogs = await HourLog.find({ task: task._id });
      const actualHours = hourLogs.reduce((total, log) => total + log.hours, 0);
      
      return {
        ...task.toObject(),
        actualHours,
        hourLogsCount: hourLogs.length
      };
    })
  );

  const total = await Task.countDocuments(query);

  return sendResponse(res, {
    success: true,
    data: {
      tasks: tasksWithHours,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

export const getTaskById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userRole = req.user.role;

  const task = await Task.findById(id)
    .populate('project', 'name client developers')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  if (!task) {
    return sendResponse(res, {
      success: false,
      message: 'Task not found',
      statusCode: 404
    });
  }

  // Check access permissions
  if (userRole === 1) { // Client
    const project = task.project as any;
    if (project.client.toString() !== req.user._id.toString()) {
      return sendResponse(res, {
        success: false,
        message: 'Access denied',
        statusCode: 403
      });
    }
  } else if (userRole === 2) { // Developer
    const isAssigned = task.assignedTo.some((dev: any) => dev._id.toString() === req.user._id.toString());
    if (!isAssigned) {
      return sendResponse(res, {
        success: false,
        message: 'Access denied',
        statusCode: 403
      });
    }
  }

  // Fetch actual hours
  const hourLogs = await HourLog.find({ task: task._id });
  const actualHours = hourLogs.reduce((total, log) => total + log.hours, 0);

  return sendResponse(res, {
    success: true,
    data: { 
      task: {
        ...task.toObject(),
        actualHours,
        hourLogsCount: hourLogs.length
      }
    }
  });
});

export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, assignedTo, status, priority, estimatedHours, startDate, dueDate } = req.body;

  const task = await Task.findById(id).populate('project');
  if (!task) {
    return sendResponse(res, {
      success: false,
      message: 'Task not found',
      statusCode: 404
    });
  }

  // Only BA can update task details (except status)
  // Developers can update status of their assigned tasks
  if (req.user.role === 2) { // Developer
    const isAssigned = task.assignedTo.some((dev: any) => dev.toString() === req.user._id.toString());
    if (!isAssigned) {
      return sendResponse(res, {
        success: false,
        message: 'You can only update tasks assigned to you',
        statusCode: 403
      });
    }
    
    // Developers can only update status
    if (status) {
      task.status = status;
      await task.save();
      
      const updatedTask = await Task.findById(id)
        .populate('project', 'name')
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email');
      
      return sendResponse(res, {
        success: true,
        message: 'Task status updated successfully',
        data: { task: updatedTask }
      });
    } else {
      return sendResponse(res, {
        success: false,
        message: 'Developers can only update task status',
        statusCode: 403
      });
    }
  }

  // BA can update all fields
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can update task details',
      statusCode: 403
    });
  }

  // Verify assigned developers are part of the project
  if (assignedTo && assignedTo.length > 0) {
    const project = task.project as any;
    const projectDeveloperIds = project.developers.map((d: any) => d.toString());
    const invalidDevelopers = assignedTo.filter((devId: string) => !projectDeveloperIds.includes(devId));
    
    if (invalidDevelopers.length > 0) {
      return sendResponse(res, {
        success: false,
        message: 'Assigned developers must be part of the project',
        statusCode: 400
      });
    }
  }

  const updatedTask = await Task.findByIdAndUpdate(
    id,
    {
      title,
      description,
      assignedTo,
      status,
      priority,
      estimatedHours,
      startDate,
      dueDate
    },
    { new: true, runValidators: true }
  )
    .populate('project', 'name')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  return sendResponse(res, {
    success: true,
    message: 'Task updated successfully',
    data: { task: updatedTask },
    toast:true,
    toastMessageFlag:true
  });
});

export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) {
    return sendResponse(res, {
      success: false,
      message: 'Task not found',
      statusCode: 404
    });
  }

  // Only BA can delete tasks
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can delete tasks',
      statusCode: 403
    });
  }

  await Task.findByIdAndDelete(id);

  return sendResponse(res, {
    success: true,
    message: 'Task deleted successfully',
    toast:true
  });
});

export const getTasksByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userRole = req.user.role;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return sendResponse(res, {
      success: false,
      message: 'Project not found',
      statusCode: 404
    });
  }

  // Check access
  if (userRole === 1 && project.client.toString() !== req.user._id.toString()) {
    return sendResponse(res, {
      success: false,
      message: 'Access denied',
      statusCode: 403
    });
  }

  let query: any = { project: projectId };

  // Developers only see their assigned tasks
  if (userRole === 2) {
    query.assignedTo = { $in: [req.user._id] };
  }

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  // Fetch actual logged hours for each task
  const tasksWithHours = await Promise.all(
    tasks.map(async (task) => {
      const hourLogs = await HourLog.find({ task: task._id });
      const actualHours = hourLogs.reduce((total, log) => total + log.hours, 0);
      
      return {
        ...task.toObject(),
        actualHours,
        hourLogsCount: hourLogs.length
      };
    })
  );

  return sendResponse(res, {
    success: true,
    data: { tasks: tasksWithHours }
  });
});
