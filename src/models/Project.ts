import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  client: mongoose.Schema.Types.ObjectId;
  developers: mongoose.Schema.Types.ObjectId[];
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  startDate?: Date;
  endDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  hourlyRate?: number;
  billingType: 'Hourly' | 'Fixed';
  createdBy: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required']
  },
  developers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'],
    default: 'Planning'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours must be positive']
  },
  actualHours: {
    type: Number,
    default: 0,
    min: [0, 'Actual hours must be positive']
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate must be positive']
  },
  billingType: {
    type: String,
    enum: ['Hourly', 'Fixed'],
    default: 'Hourly'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true
});

projectSchema.index({ client: 1 });
projectSchema.index({ developers: 1 });
projectSchema.index({ status: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
