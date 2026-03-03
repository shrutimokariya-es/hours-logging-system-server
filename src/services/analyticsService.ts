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

// export interface TaskCompletionAnalytics {
//   averageCompletionTime: number; // in days
//   totalTasks: number;
//   completedTasks: number;
//   completionRate: number;
//   averageEstimatedVsActual: number; // ratio
//   tasksByStatus: {
//     status: string;
//     count: number;
//     percentage: number;
//   }[];
// }

// export interface DeadlineAnalytics {
//   totalTasksWithDeadlines: number;
//   missedDeadlines: number;
//   upcomingDeadlines: number;
//   onTimeCompletions: number;
//   missedDeadlineRatio: number;
//   criticalUpcoming: {
//     taskId: string;
//     taskTitle: string;
//     projectName: string;
//     dueDate: Date;
//     daysRemaining: number;
//     assignedTo: string[];
//   }[];
// }

export interface PredictiveInsights {
  clientHoursAnalytics: ClientHoursAnalytics[];
  developerWorkloadAnalytics: DeveloperWorkloadAnalytics[];
  // taskCompletionAnalytics: TaskCompletionAnalytics;
  // deadlineAnalytics: DeadlineAnalytics;
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
    // taskCompletionAnalytics,
    // deadlineAnalytics,
    trends
  ] = await Promise.all([
    getClientHoursAnalytics(startDate, endDate, userRole, userId),
    getDeveloperWorkloadAnalytics(startDate, endDate, userRole, userId),
    // getTaskCompletionAnalytics(userRole, userId),
    // getDeadlineAnalytics(userRole, userId),
    getTrends(userRole, userId)
  ]);

  return {
    clientHoursAnalytics,
    developerWorkloadAnalytics,
    // taskCompletionAnalytics,
    // deadlineAnalytics,
    trends
  };
};

export const analyticsService = {
  getPredictiveInsights
};
