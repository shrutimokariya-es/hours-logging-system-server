import { User } from '../models';
import { HourLog, IHourLog } from '../models/HourLog';
import { Types } from 'mongoose';

interface DashboardSummary {
  totalClients: number;
  totalDevelopers: number;
  totalHoursThisMonth: number;
  totalHoursOverall: number;
  recentLogs: Array<{
    id: string;
    project: string;
    clientName: string;
    developerName: string;
    hours: number;
    date: string;
    description?: string;
  }>;
  topClientsThisMonth: Array<{
    clientId: string;
    clientName: string;
    totalHours: number;
  }>;
}

const getTotalActiveClients = async (userId: string, userRole: number): Promise<number> => {
  if (userRole === 2) {
    // For developers, count only clients they've worked with
    const result = await HourLog.distinct('client', { developer: new Types.ObjectId(userId) });
    return await User.countDocuments({ 
      _id: { $in: result },
      role: 1, 
      status: 'Active' 
    });
  }
  // For BA, count all active clients
  return await User.countDocuments({ 
    role: 1, 
    status: 'Active' 
  });
};

const getTotalActiveDevelopers = async (userId: string, userRole: number): Promise<number> => {
  if (userRole === 2) {
    // For developers, they only see themselves
    return 1; // Themselves
  }
  // For BA, count all active developers
  return await User.countDocuments({ 
    role: 2, 
    status: 'Active' 
  });
};

const getTotalHoursForPeriod = async (startDate: Date, endDate: Date, userId: string, userRole: number): Promise<number> => {
  const matchQuery: any = {
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (userRole === 2) {
    // For developers, only their own hours
    matchQuery.developer = new Types.ObjectId(userId);
  }
  
  const result = await HourLog.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' }
      }
    }
  ]);

  return result[0]?.totalHours || 0;
};

const getTotalHoursOverall = async (userId: string, userRole: number): Promise<number> => {
  const matchQuery: any = {};
  
  if (userRole === 2) {
    // For developers, only their own hours
    matchQuery.developer = new Types.ObjectId(userId);
  }
  
  const result = await HourLog.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' }
      }
    }
  ]);

  return result[0]?.totalHours || 0;
};

const getRecentHourLogs = async (userId: string, userRole: number): Promise<DashboardSummary['recentLogs']> => {
  const matchQuery: any = {};
  
  if (userRole === 2) {
    // For developers, only their own logs
    matchQuery.developer = new Types.ObjectId(userId);
  }
  
  const logs = await HourLog.find(matchQuery)
    .populate('client', 'name')
    .populate('developer', 'name')
    .populate('project', 'name')
    .sort({ date: -1 })
    .limit(5)
    .lean();

  return logs.map((log: any) => ({
    id: log._id.toString(),
    project: (log.project as any)?.name || 'Unknown Project',
    clientName: (log.client as any)?.name || 'Unknown Client',
    developerName: (log.developer as any)?.name || 'Unknown Developer',
    hours: log.hours,
    date: log.date.toISOString().split('T')[0],
    description: log.description
  }));
};

const getTopClientsThisMonth = async (
  startDate: Date, 
  endDate: Date, 
  userId: string,
  userRole: number
): Promise<DashboardSummary['topClientsThisMonth']> => {
  const matchQuery: any = {
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (userRole === 2) {
    // For developers, only their own logs
    matchQuery.developer = new Types.ObjectId(userId);
  }
  
  const result = await HourLog.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$client',
        totalHours: { $sum: '$hours' },
        logCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalHours: -1 }
    },
    {
      $limit: 5
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'client'
      }
    },
    {
      $unwind: '$client'
    },
    {
      $project: {
        clientId: '$_id',
        clientName: '$client.name',
        totalHours: 1
      }
    }
  ]);

  return result.map(item => ({
    clientId: item.clientId.toString(),
    clientName: item.clientName,
    totalHours: item.totalHours
  }));
};

const getDashboardSummary = async (userId: string, userRole: number): Promise<DashboardSummary> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Use Promise.all for parallel execution
  const [
    totalClients,
    totalDevelopers,
    totalHoursThisMonth,
    totalHoursOverall,
    recentLogs,
    topClientsThisMonth
  ] = await Promise.all([
    getTotalActiveClients(userId, userRole),
    getTotalActiveDevelopers(userId, userRole),
    getTotalHoursForPeriod(startOfMonth, endOfMonth, userId, userRole),
    getTotalHoursOverall(userId, userRole),
    getRecentHourLogs(userId, userRole),
    getTopClientsThisMonth(startOfMonth, endOfMonth, userId, userRole)
  ]);
  
  return {
    totalClients,
    totalDevelopers,
    totalHoursThisMonth,
    totalHoursOverall,
    recentLogs,
    topClientsThisMonth
  };
};

export const dashboardService = {
  getDashboardSummary
};
