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

const getTotalActiveClients = async (userId: string): Promise<number> => {
  const data = await User.countDocuments({role:1,status:"Active"})
  console.log("data", data)
  return await User.countDocuments({ 
    // userId: new Types.ObjectId(userId),
    role: 1, // Client role
    status: 'Active' 
  });
};

const getTotalActiveDevelopers = async (userId: string): Promise<number> => {
  return await User.countDocuments({ 
    // userId: new Types.ObjectId(userId),
    role: 2, // Developer role
    status: 'Active' 
  });
};

const getTotalHoursForPeriod = async (startDate: Date, endDate: Date, userId: string): Promise<number> => {
  const result = await HourLog.aggregate([
    {
      $match: {
        // userId: new Types.ObjectId(userId),
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
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

const getTotalHoursOverall = async (userId: string): Promise<number> => {
  const result = await HourLog.aggregate([
    // {
    //   $match: {
    //     // userId: new Types.ObjectId(userId)
    //   }
    // },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' }
      }
    }
  ]);

  return result[0]?.totalHours || 0;
};

const getRecentHourLogs = async (userId: string): Promise<DashboardSummary['recentLogs']> => {
  const logs = await HourLog.find()
    .populate('client', 'name')
    .populate('developer', 'name')
    .sort({ date: -1 })
    .limit(5)
    .lean();
console.log("rolessss",logs)
  return logs.map((log: any) => ({
    id: log._id.toString(),
    project: log.project || 'Unknown Project',
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
  userId: string
): Promise<DashboardSummary['topClientsThisMonth']> => {
  const result = await HourLog.aggregate([
    {
      $match: {
        // userId: new Types.ObjectId(userId),
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$clientId',
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

const getDashboardSummary = async (userId: string): Promise<DashboardSummary> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
console.log("userID",userId)
  // Use Promise.all for parallel execution
  const [
    totalClients,
    totalDevelopers,
    totalHoursThisMonth,
    totalHoursOverall,
    recentLogs,
    topClientsThisMonth
  ] = await Promise.all([
    getTotalActiveClients(userId),
    getTotalActiveDevelopers(userId),
    getTotalHoursForPeriod(startOfMonth, endOfMonth, userId),
    getTotalHoursOverall(userId),
    getRecentHourLogs(userId),
    getTopClientsThisMonth(startOfMonth, endOfMonth, userId)
  ]);
  console.log("totalClients", totalClients);
  console.log("totalDevelopers", totalDevelopers);
  console.log("totalHoursThisMonth", totalHoursThisMonth);
  console.log("totalHoursOverall", totalHoursOverall);
  console.log("recentLogs", recentLogs);
  console.log("topClientsThisMonth", topClientsThisMonth);
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
