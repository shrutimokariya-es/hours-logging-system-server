import { HourLog } from '../models/HourLog';
import { Task } from '../models/Task';
import { User } from '../models';
import { Types } from 'mongoose';

export interface ClientHoursAnalytics {
  clientId: string;
  clientName: string;
  totalHours: number;
  projectCount: number;
  averageHoursPerProject: number;
  percentage: number;
}

export interface DeveloperWorkloadAnalytics {
  developerId: string;
  developerName: string;
  totalHours: number;
  projectCount: number;
  taskCount: number;
  averageHoursPerDay: number;
  workloadStatus: 'Underutilized' | 'Optimal' | 'Overloaded' | 'Critical';
  utilizationPercentage: number;
}

export interface TaskCompletionAnalytics {
  averageCompletionTime: number; // in days
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageEstimatedVsActual: number; // ratio
  tasksByStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
}

export interface DeadlineAnalytics {
  totalTasksWithDeadlines: number;
  missedDeadlines: number;
  upcomingDeadlines: number;
  onTimeCompletions: number;
  missedDeadlineRatio: number;
  criticalUpcoming: {
    taskId: string;
    taskTitle: string;
    projectName: string;
    dueDate: Date;
    daysRemaining: number;
    assignedTo: string[];
  }[];
}

export interface PredictiveInsights {
  clientHoursAnalytics: ClientHoursAnalytics[];
  developerWorkloadAnalytics: DeveloperWorkloadAnalytics[];
  taskCompletionAnalytics: TaskCompletionAnalytics;
  deadlineAnalytics: DeadlineAnalytics;
  trends: {
    hoursThisMonth: number;
    hoursLastMonth: number;
    growthPercentage: number;
    projectedNextMonth: number;
  };
}

const getClientHoursAnalytics = async (
  startDate: Date,
  endDate: Date,
  userRole: number,
  userId: string
): Promise<ClientHoursAnalytics[]> => {
  const matchQuery: any = {
    date: { $gte: startDate, $lte: endDate }
  };

  if (userRole === 2) {
    matchQuery.developer = new Types.ObjectId(userId);
  }

  const result = await HourLog.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$client',
        totalHours: { $sum: '$hours' },
        projects: { $addToSet: '$project' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'clientInfo'
      }
    },
    { $unwind: '$clientInfo' },
    {
      $project: {
        clientId: '$_id',
        clientName: '$clientInfo.name',
        totalHours: 1,
        projectCount: { $size: '$projects' }
      }
    },
    { $sort: { totalHours: -1 } }
  ]);

  const totalHours = result.reduce((sum, item) => sum + item.totalHours, 0);

  return result.map(item => ({
    clientId: item.clientId.toString(),
    clientName: item.clientName,
    totalHours: item.totalHours,
    projectCount: item.projectCount,
    averageHoursPerProject: item.projectCount > 0 ? item.totalHours / item.projectCount : 0,
    percentage: totalHours > 0 ? (item.totalHours / totalHours) * 100 : 0
  }));
};

const getDeveloperWorkloadAnalytics = async (
  startDate: Date,
  endDate: Date,
  userRole: number,
  userId: string
): Promise<DeveloperWorkloadAnalytics[]> => {
  const matchQuery: any = {
    date: { $gte: startDate, $lte: endDate }
  };

  if (userRole === 2) {
    matchQuery.developer = new Types.ObjectId(userId);
  }

  const result = await HourLog.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$developer',
        totalHours: { $sum: '$hours' },
        projects: { $addToSet: '$project' },
        tasks: { $addToSet: '$task' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'developerInfo'
      }
    },
    { $unwind: '$developerInfo' },
    {
      $project: {
        developerId: '$_id',
        developerName: '$developerInfo.name',
        totalHours: 1,
        projectCount: { $size: '$projects' },
        taskCount: { $size: '$tasks' }
      }
    },
    { $sort: { totalHours: -1 } }
  ]);

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const workingDays = daysDiff > 0 ? daysDiff : 1;

  return result.map(item => {
    const averageHoursPerDay = item.totalHours / workingDays;
    const utilizationPercentage = (averageHoursPerDay / 8) * 100; // Assuming 8-hour workday

    let workloadStatus: DeveloperWorkloadAnalytics['workloadStatus'];
    if (utilizationPercentage < 50) {
      workloadStatus = 'Underutilized';
    } else if (utilizationPercentage >= 50 && utilizationPercentage <= 100) {
      workloadStatus = 'Optimal';
    } else if (utilizationPercentage > 100 && utilizationPercentage <= 125) {
      workloadStatus = 'Overloaded';
    } else {
      workloadStatus = 'Critical';
    }

    return {
      developerId: item.developerId.toString(),
      developerName: item.developerName,
      totalHours: item.totalHours,
      projectCount: item.projectCount,
      taskCount: item.taskCount,
      averageHoursPerDay: parseFloat(averageHoursPerDay.toFixed(2)),
      workloadStatus,
      utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2))
    };
  });
};

const getTaskCompletionAnalytics = async (
  userRole: number,
  userId: string
): Promise<TaskCompletionAnalytics> => {
  const matchQuery: any = {};

  if (userRole === 2) {
    matchQuery.assignedTo = new Types.ObjectId(userId);
  }

  const tasks = await Task.find(matchQuery).lean();
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  // Calculate average completion time
  let totalCompletionDays = 0;
  let tasksWithDates = 0;
  let totalEstimatedVsActual = 0;
  let tasksWithEstimates = 0;

  completedTasks.forEach(task => {
    if (task.startDate && task.updatedAt) {
      const completionTime = (new Date(task.updatedAt).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24);
      totalCompletionDays += completionTime;
      tasksWithDates++;
    }

    if (task.estimatedHours && task.actualHours) {
      totalEstimatedVsActual += task.actualHours / task.estimatedHours;
      tasksWithEstimates++;
    }
  });

  const averageCompletionTime = tasksWithDates > 0 ? totalCompletionDays / tasksWithDates : 0;
  const averageEstimatedVsActual = tasksWithEstimates > 0 ? totalEstimatedVsActual / tasksWithEstimates : 1;

  // Group by status
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tasksByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: (count / tasks.length) * 100
  }));

  return {
    averageCompletionTime: parseFloat(averageCompletionTime.toFixed(2)),
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
    averageEstimatedVsActual: parseFloat(averageEstimatedVsActual.toFixed(2)),
    tasksByStatus
  };
};

const getDeadlineAnalytics = async (
  userRole: number,
  userId: string
): Promise<DeadlineAnalytics> => {
  const matchQuery: any = {
    dueDate: { $exists: true, $ne: null }
  };

  if (userRole === 2) {
    matchQuery.assignedTo = new Types.ObjectId(userId);
  }

  const tasks = await Task.find(matchQuery)
    .populate('project', 'name')
    .populate('assignedTo', 'name')
    .lean();

  const now = new Date();
  let missedDeadlines = 0;
  let upcomingDeadlines = 0;
  let onTimeCompletions = 0;
  const criticalUpcoming: DeadlineAnalytics['criticalUpcoming'] = [];

  tasks.forEach(task => {
    const dueDate = new Date(task.dueDate!);
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (task.status === 'Completed') {
      // Check if completed on time
      if (task.updatedAt && new Date(task.updatedAt) <= dueDate) {
        onTimeCompletions++;
      } else {
        missedDeadlines++;
      }
    } else {
      // Task not completed
      if (dueDate < now) {
        missedDeadlines++;
      } else {
        upcomingDeadlines++;
        
        // Critical if due within 3 days
        if (daysRemaining <= 3) {
          criticalUpcoming.push({
            taskId: task._id.toString(),
            taskTitle: task.title,
            projectName: (task.project as any)?.name || 'Unknown',
            dueDate: task.dueDate!,
            daysRemaining,
            assignedTo: (task.assignedTo as any[]).map((dev: any) => dev.name)
          });
        }
      }
    }
  });

  const missedDeadlineRatio = tasks.length > 0 ? (missedDeadlines / tasks.length) * 100 : 0;

  return {
    totalTasksWithDeadlines: tasks.length,
    missedDeadlines,
    upcomingDeadlines,
    onTimeCompletions,
    missedDeadlineRatio: parseFloat(missedDeadlineRatio.toFixed(2)),
    criticalUpcoming: criticalUpcoming.sort((a, b) => a.daysRemaining - b.daysRemaining)
  };
};

const getTrends = async (
  userRole: number,
  userId: string
): Promise<PredictiveInsights['trends']> => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const matchQueryBase: any = {};
  if (userRole === 2) {
    matchQueryBase.developer = new Types.ObjectId(userId);
  }

  const [thisMonth, lastMonth] = await Promise.all([
    HourLog.aggregate([
      { $match: { ...matchQueryBase, date: { $gte: thisMonthStart, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ]),
    HourLog.aggregate([
      { $match: { ...matchQueryBase, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ])
  ]);

  const hoursThisMonth = thisMonth[0]?.total || 0;
  const hoursLastMonth = lastMonth[0]?.total || 0;
  const growthPercentage = hoursLastMonth > 0 
    ? ((hoursThisMonth - hoursLastMonth) / hoursLastMonth) * 100 
    : 0;

  // Simple projection: current month trend + growth rate
  const projectedNextMonth = hoursThisMonth > 0 
    ? hoursThisMonth * (1 + (growthPercentage / 100))
    : hoursLastMonth;

  return {
    hoursThisMonth,
    hoursLastMonth,
    growthPercentage: parseFloat(growthPercentage.toFixed(2)),
    projectedNextMonth: parseFloat(projectedNextMonth.toFixed(2))
  };
};

const getPredictiveInsights = async (
  userRole: number,
  userId: string,
  startDateStr?: string,
  endDateStr?: string
): Promise<PredictiveInsights> => {
  const now = new Date();
  const startDate = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = endDateStr ? new Date(endDateStr) : now;

  const [
    clientHoursAnalytics,
    developerWorkloadAnalytics,
    taskCompletionAnalytics,
    deadlineAnalytics,
    trends
  ] = await Promise.all([
    getClientHoursAnalytics(startDate, endDate, userRole, userId),
    getDeveloperWorkloadAnalytics(startDate, endDate, userRole, userId),
    getTaskCompletionAnalytics(userRole, userId),
    getDeadlineAnalytics(userRole, userId),
    getTrends(userRole, userId)
  ]);

  return {
    clientHoursAnalytics,
    developerWorkloadAnalytics,
    taskCompletionAnalytics,
    deadlineAnalytics,
    trends
  };
};

export const analyticsService = {
  getPredictiveInsights
};
