import { Project } from '../models/Project';
import { HourLog, IHourLog } from '../models/HourLog';
import mongoose, { Types } from 'mongoose';

// In-memory storage for reports
let memoryReports: any[] = [];

// Report interface for in-memory storage
export interface Report {
  _id: string;
  title: string;
  type: string;
  status: 'generating' | 'completed' | 'failed';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalHours: number;
  totalClients: number;
  totalDevelopers: number;
  reportData?: {
    activities: Array<{
      clientName: string;
      developerName: string;
      hours: number;
      date: string;
      description?: string;
    }>;
    topClients: Array<{
      clientName: string;
      totalHours: number;
    }>;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Generate report data
const generateReportData = async (reportId: string, startDate: Date, endDate: Date) => {
  try {
    // Fetch hour logs for the date range
    const hourLogs = await HourLog.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .populate('client', 'name')
      .populate('developer', 'name')
      .lean();

    // Calculate statistics
    const totalHours = hourLogs.reduce((sum, log) => sum + (log as any).hours, 0);
    const uniqueClients = new Set(hourLogs.map((log: any) => log.client?.name)).size;
    const uniqueDevelopers = new Set(hourLogs.map((log: any) => log.developer?.name)).size;

    // Prepare activities data
    const activities = hourLogs.map((log: any) => ({
      clientName: log.client?.name || 'Unknown Client',
      developerName: log.developer?.name || 'Unknown Developer',
      hours: log.hours,
      date: log.date.toISOString().split('T')[0],
      description: log.description
    }));

    // Calculate top clients
    const clientHoursMap = new Map<string, number>();
    hourLogs.forEach((log: any) => {
      const clientName = log.client?.name || 'Unknown Client';
      const currentHours = clientHoursMap.get(clientName) || 0;
      clientHoursMap.set(clientName, currentHours + log.hours);
    });

    const topClients = Array.from(clientHoursMap.entries())
      .map(([clientName, totalHours]) => ({ clientName, totalHours }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 10);

    // Update report with generated data
    const reportIndex = memoryReports.findIndex(r => r._id === reportId);
    if (reportIndex !== -1) {
      memoryReports[reportIndex] = {
        ...memoryReports[reportIndex],
        status: 'completed',
        totalHours,
        totalClients: uniqueClients,
        totalDevelopers: uniqueDevelopers,
        reportData: {
          activities,
          topClients
        }
      };
    }
  } catch (error) {
    // Mark report as failed
    const reportIndex = memoryReports.findIndex(r => r._id === reportId);
    if (reportIndex !== -1) {
      memoryReports[reportIndex] = {
        ...memoryReports[reportIndex],
        status: 'failed'
      };
    }
    console.error(`Failed to generate report ${reportId}:`, error);
  }
};

// Generate new report
export const generateReport = async (data: any) => {
  try {
    const report: Report = {
      _id: new Types.ObjectId().toString(),
      title: data.title,
      type: data.type || 'custom',
      status: 'generating',
      dateRange: {
        startDate: data.startDate.toISOString().split('T')[0],
        endDate: data.endDate.toISOString().split('T')[0]
      },
      totalHours: 0,
      totalClients: 0,
      totalDevelopers: 0,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryReports.push(report);

    // Generate report data asynchronously
    setTimeout(() => {
      generateReportData(report._id, data.startDate, data.endDate);
    }, 1000);

    return report;
  } catch (error) {
    throw new Error(`Failed to create report: ${error}`);
  }
};

// Get client hours with project breakdown
export const getClientProjectHours = async (
  clientId: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    const dateFilter: any = {};
    
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        dateFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.date.$lte = new Date(endDate);
      }
    }

    const projectHours = await HourLog.aggregate([
      {
        $match: {
          client: new mongoose.Types.ObjectId(clientId),
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'developer',
          foreignField: '_id',
          as: 'developerInfo'
        }
      },
      {
        $group: {
          _id: '$project',
          totalHours: { $sum: '$hours' },
          developers: {
            $push: {
              _id: '$developerInfo._id',
              name: '$developerInfo.name',
              hours: { $sum: '$hours' }
            }
          },
          dateRange: {
            $min: '$date',
            $max: '$date'
          }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$projectInfo.name',
          totalHours: 1,
          developers: 1,
          dateRange: 1
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    return projectHours;
  } catch (error) {
    console.error('Error fetching client hours with projects:', error);
    throw error;
  }
};

// Get all reports (from memory)
export const getAllReports = async (page: number = 1, limit: number = 10, type?: string, status?: string) => {
  try {
    let filteredReports = memoryReports;

    if (type) {
      filteredReports = filteredReports.filter(r => r.type === type);
    }

    if (status) {
      filteredReports = filteredReports.filter(r => r.status === status);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    return {
      reports: paginatedReports,
      pagination: {
        page,
        limit,
        total: filteredReports.length,
        pages: Math.ceil(filteredReports.length / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get reports: ${error}`);
  }
};

// Get report by ID (from memory)
export const getReportById = async (id: string) => {
  try {
    const report = memoryReports.find(r => r._id === id);
    if (!report) {
      throw new Error('Report not found');
    }
    return report;
  } catch (error) {
    throw new Error(`Failed to get report: ${error}`);
  }
};

// Delete report (from memory)
export const deleteReport = async (id: string) => {
  try {
    const index = memoryReports.findIndex(r => r._id === id);
    if (index === -1) {
      throw new Error('Report not found');
    }
    memoryReports.splice(index, 1);
  } catch (error) {
    throw new Error(`Failed to delete report: ${error}`);
  }
};

// Get report statistics (from memory)
export const getReportStats = async () => {
  try {
    const totalReports = memoryReports.length;
    const completedReports = memoryReports.filter(r => r.status === 'completed').length;
    const generatingReports = memoryReports.filter(r => r.status === 'generating').length;
    const thisWeekReports = memoryReports.filter(r => {
      const reportDate = new Date(r.createdAt);
      const weekStart = new Date(new Date().setDate(new Date().getDate() - new Date().getDay()));
      return reportDate >= weekStart;
    }).length;

    return {
      totalReports,
      completedReports,
      generatingReports,
      thisWeekReports
    };
  } catch (error) {
    throw new Error(`Failed to get report stats: ${error}`);
  }
};

// Get client hours data
export const getClientHours = async (period: string = 'monthly', clientId?: string) => {
  try {
    const now = new Date();
    let dateFilter: any = {};
    
    // Calculate date range based on period
    switch (period) {
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(now);
        weekEnd.setHours(23, 59, 59, 999);
        dateFilter = {
          $gte: weekStart,
          $lte: weekEnd
        };
        break;
      case 'this-month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFilter = {
          $gte: monthStart,
          $lte: monthEnd
        };
        break;
      case 'last-month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFilter = {
          $gte: lastMonthStart,
          $lte: lastMonthEnd
        };
        break;
      case 'this-quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        dateFilter = {
          $gte: quarterStart,
          $lte: quarterEnd
        };
        break;
      case 'this-year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        dateFilter = {
          $gte: yearStart,
          $lte: yearEnd
        };
        break;
      default:
        // Default to this month
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFilter = {
          $gte: defaultStart,
          $lte: defaultEnd
        };
    }
    
    const query: any = {
      date: dateFilter
    };
    let projectList: any = [];
    if (clientId) {
      query.client = new Types.ObjectId(clientId);
      const pros = await Project.find({client: new Types.ObjectId(clientId)}, { name: 1, developers: 1, estimatedHours: 1})
        .populate('developers', 'name email')
        .lean();
      
      // Fetch actual hours for each project
      const projectsWithHours = await Promise.all(
        pros.map(async (project) => {
          const hourLogs = await HourLog.find({ project: project._id });
          const actualHours = hourLogs.reduce((total, log) => total + log.hours, 0);
          
          return {
            ...project,
            actualHours,
            hourLogsCount: hourLogs.length
          };
        })
      );
      
      projectList.push(...projectsWithHours)
    }
    
    const hourLogs = await HourLog.find(query)
      .populate('client', 'name email role')
      .populate('developer')
      .populate('project', 'name')
      .lean();
    const clientData = new Map();
    
    hourLogs.forEach((log: any) => {
      const client = log.client;
      const weekKey = period === 'weekly' 
        ? `Week ${Math.ceil((new Date(log.date).getDate() / 7))}`
        : new Date(log.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!clientData.has(client._id)) {
        clientData.set(client._id, {
          clientId: client._id,
          clientName: client.name,
          clientEmail: client.email,
          clientRole: client.role,
          totalHours: 0,
          weeklyHours: {},
          monthlyHours: {},
          developers: new Set(),
          logs: []
        });
      }
      
      const data = clientData.get(client._id);
      data.totalHours += log.hours;
      data.developers.add(log);
      data.logs.push(log);
      
      
      if (period === 'weekly') {
        data.weeklyHours[weekKey] = (data.weeklyHours[weekKey] || 0) + log.hours;
      } else {
        data.monthlyHours[weekKey] = (data.monthlyHours[weekKey] || 0) + log.hours;
      }
    });

    return Array.from(clientData.values()).map(client => ({
      ...client,
      developers: Array.from(client.developers),
      weeklyHours: client.weeklyHours,
      monthlyHours: client.monthlyHours,
      totalProjects: projectList
    }));
  } catch (error) {
    throw new Error(`Failed to get client hours: ${error}`);
  }
};

// Get developer hours data
export const getDeveloperHours = async (period: string = 'monthly', developerId?: string, userRole?: number, userId?: string) => {
  try {
    const now = new Date();
    let dateFilter: any = {};
    
    // Calculate date range based on period
    switch (period) {
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(now);
        weekEnd.setHours(23, 59, 59, 999);
        dateFilter = {
          $gte: weekStart,
          $lte: weekEnd
        };
        break;
      case 'this-month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFilter = {
          $gte: monthStart,
          $lte: monthEnd
        };
        break;
      case 'last-month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFilter = {
          $gte: lastMonthStart,
          $lte: lastMonthEnd
        };
        break;
      case 'this-quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        dateFilter = {
          $gte: quarterStart,
          $lte: quarterEnd
        };
        break;
      case 'this-year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        dateFilter = {
          $gte: yearStart,
          $lte: yearEnd
        };
        break;
      default:
        // Default to this month
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFilter = {
          $gte: defaultStart,
          $lte: defaultEnd
        };
    }
    
    const query: any = {
      date: dateFilter
    };
    
    // Role-based filtering
    if (userRole === 2 && userId) {
      // Developers can only see their own hours
      query.developer = new Types.ObjectId(userId);
    } else if (developerId) {
      // BA can filter by specific developer
      query.developer = new Types.ObjectId(developerId);
    }
    
    const hourLogs = await HourLog.find(query)
      .populate('client', 'name email role')
      .populate('developer', 'name email role')
      .lean();

    const developerData = new Map();
    
    hourLogs.forEach((log: any) => {
      const developer = log.developer;
      const weekKey = period === 'weekly' 
        ? `Week ${Math.ceil((new Date(log.date).getDate() / 7))}`
        : new Date(log.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!developerData.has(developer._id)) {
        developerData.set(developer._id, {
          developerId: developer._id,
          developerName: developer.name,
          developerEmail: developer.email,
          developerRole: developer.role,
          totalHours: 0,
          weeklyHours: {},
          monthlyHours: {},
          clients: new Set(),
          logs: []
        });
      }
      
      const data = developerData.get(developer._id);
      data.totalHours += log.hours;
      data.clients.add(log.client.name);
      data.logs.push(log);
      
      if (period === 'weekly') {
        data.weeklyHours[weekKey] = (data.weeklyHours[weekKey] || 0) + log.hours;
      } else {
        data.monthlyHours[weekKey] = (data.monthlyHours[weekKey] || 0) + log.hours;
      }
    });

    return Array.from(developerData.values()).map(developer => ({
      ...developer,
      clients: Array.from(developer.clients),
      weeklyHours: developer.weeklyHours,
      monthlyHours: developer.monthlyHours
    }));
  } catch (error) {
    throw new Error(`Failed to get developer hours: ${error}`);
  }
};

// Get combined hours summary
export const getHoursSummary = async (period: string = 'monthly', startDate?: string, endDate?: string, userRole?: number, userId?: string) => {
  try {
    const now = new Date();
    let dateFilter: any = {};
    
    // Calculate date range based on period
    if (startDate && endDate) {
      // Custom date range
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Predefined periods
      switch (period) {
        case 'weekly':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(now);
          weekEnd.setHours(23, 59, 59, 999);
          dateFilter = {
            $gte: weekStart,
            $lte: weekEnd
          };
          break;
        case 'this-month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          dateFilter = {
            $gte: monthStart,
            $lte: monthEnd
          };
          break;
        case 'last-month':
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          dateFilter = {
            $gte: lastMonthStart,
            $lte: lastMonthEnd
          };
          break;
        case 'this-quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
          const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
          dateFilter = {
            $gte: quarterStart,
            $lte: quarterEnd
          };
          break;
        case 'this-year':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          const yearEnd = new Date(now.getFullYear(), 11, 31);
          dateFilter = {
            $gte: yearStart,
            $lte: yearEnd
          };
          break;
        default:
          // Default to this month
          const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          dateFilter = {
            $gte: defaultStart,
            $lte: defaultEnd
          };
      }
    }
    
    const query: any = {
      date: dateFilter
    };
    
    // Role-based filtering
    if (userRole === 2 && userId) {
      // Developers can only see their own hours
      query.developer = new Types.ObjectId(userId);
    }
    
    const hourLogs = await HourLog.find(query)
      .populate('client', 'name email role')
      .populate('developer', 'name email role')
      .populate('project', 'name')
      .populate('createdBy', 'name email')
      .lean();

    // Calculate summary statistics
    const totalHours = hourLogs.reduce((sum: number, log: any) => sum + (log as any).hours, 0);
    const totalLogs = hourLogs.length;
    const uniqueClients = new Set(hourLogs.map((log: any) => log.client?.name)).size;
    const uniqueDevelopers = new Set(hourLogs.map((log: any) => log.developer?.name)).size;

    // Client breakdown
    const clientBreakdown = hourLogs.reduce((acc: any[], log: any) => {
      const clientName = log.client?.name || 'Unknown Client';
      const existingClient = acc.find(c => c.name === clientName);
      
      if (existingClient) {
        existingClient.hours += log.hours;
        existingClient.logs.push(log);
      } else {
        acc.push({
          name: clientName,
          email: log.client?.email || '',
          role: log.client?.role || '',
          hours: log.hours,
          logs: [log]
        });
      }
      
      return acc;
    }, []);

    // Developer breakdown
    const developerBreakdown = hourLogs.reduce((acc: any[], log: any) => {
      const developerName = log.developer?.name || 'Unknown Developer';
      const existingDeveloper = acc.find(d => d.name === developerName);
      
      if (existingDeveloper) {
        existingDeveloper.hours += log.hours;
        existingDeveloper.logs.push(log);
      } else {
        acc.push({
          name: developerName,
          email: log.developer?.email || '',
          role: log.developer?.role || '',
          hours: log.hours,
          logs: [log]
        });
      }
      
      return acc;
    }, []);

    // Recent logs (last 10)
    const recentLogs = hourLogs.slice(-10).reverse().map((log: any) => ({
      id: log._id.toString(),
      clientName: log.client?.name || 'Unknown Client',
      developerName: log.developer?.name || 'Unknown Developer',
      project: log.project?.name || 'N/A',
      hours: log.hours,
      date: log.date.toISOString().split('T')[0],
      description: log.description
    }));

    return {
      totalHours,
      totalLogs,
      uniqueClients,
      uniqueDevelopers,
      clientBreakdown,
      developerBreakdown,
      recentLogs
    };
  } catch (error) {
    throw new Error(`Failed to get hours summary: ${error}`);
  }
};

export const reportService = {
  generateReport,
  getAllReports,
  getReportById,
  deleteReport,
  getReportStats,
  getClientHours,
  getDeveloperHours,
  getHoursSummary,
  getClientProjectHours
};
