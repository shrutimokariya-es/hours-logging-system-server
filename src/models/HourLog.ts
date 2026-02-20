import mongoose, { Document, Schema } from 'mongoose';

export interface IHourLog extends Document {
  client: mongoose.Types.ObjectId;
  developer: mongoose.Types.ObjectId;
  // project: string;
  date: Date;
  hours: number;
  description: string;
  createdBy: mongoose.Types.ObjectId;
}

const hourLogSchema = new Schema<IHourLog>({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required']
  },
  developer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Developer is required']
  },
  // project: {
  //   type: String,
  //   required: [true, 'Project is required'],
  //   trim: true,
  //   maxlength: [100, 'Project name cannot exceed 100 characters']
  // },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(value: Date) {
        return value <= new Date();
      },
      message: 'Date cannot be in the future'
    }
  },
  hours: {
    type: Number,
    required: [true, 'Hours are required'],
    min: [0.5, 'Minimum 0.5 hours required'],
    max: [24, 'Maximum 24 hours allowed per day'],
    validate: {
      validator: function(value: number) {
        return value % 0.5 === 0;
      },
      message: 'Hours must be in 0.5 hour increments'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  }
}, {
  timestamps: true
});

hourLogSchema.index({ client: 1, date: -1 });
hourLogSchema.index({ developer: 1, date: -1 });
hourLogSchema.index({ date: -1 });
hourLogSchema.index({ createdBy: 1 });

export const HourLog = mongoose.model<IHourLog>('HourLog', hourLogSchema);
