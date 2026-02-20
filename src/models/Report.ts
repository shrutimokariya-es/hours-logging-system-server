import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  title: string;
  type: string;
  status: 'generating' | 'completed' | 'failed';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  totalHours: number;
  totalClients: number;
  totalDevelopers: number;
  reportData: {
    activities: Array<{
      clientName: string;
      clientEmail: string;
      clientRole: string;
      developerName: string;
      developerEmail: string;
      developerRole: string;
      hours: number;
      date: string;
      description?: string;
      createdBy: string;
    }>;
    topClients: Array<{
      clientId: string;
      clientName: string;
      clientEmail: string;
      totalHours: number;
      uniqueDevelopers: number;
      logs: Array<any>;
    }>;
    topDevelopers: Array<{
      developerId: string;
      developerName: string;
      developerEmail: string;
      totalHours: number;
      uniqueClients: number;
      logs: Array<any>;
    }>;
    clientDetails: Array<any>;
    developerDetails: Array<any>;
    statistics: {
      totalLogs: number;
      avgHoursPerLog: number;
      dateRange: {
        startDate: string;
        endDate: string;
        totalDays: number;
      };
      uniqueClients: number;
      uniqueDevelopers: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>({
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  type: {
    type: String,
    required: [true, 'Report type is required'],
    enum: ['weekly', 'monthly', 'yearly', 'custom'],
    default: 'custom'
  },
  status: {
    type: String,
    required: true,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  dateRange: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    }
  },
  totalHours: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Total hours cannot be negative']
  },
  totalClients: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Total clients cannot be negative']
  },
  totalDevelopers: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Total developers cannot be negative']
  },
  reportData: {
    activities: [{
      clientName: {
        type: String,
        required: true
      },
      developerName: {
        type: String,
        required: true
      },
      hours: {
        type: Number,
        required: true,
        min: 0
      },
      date: {
        type: String,
        required: true
      },
      description: {
        type: String
      }
    }],
    topClients: [{
      clientName: {
        type: String,
        required: true
      },
      totalHours: {
        type: Number,
        required: true,
        min: 0
      }
    }]
  }
}, {
  timestamps: true
});

// Index for better query performance
reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
