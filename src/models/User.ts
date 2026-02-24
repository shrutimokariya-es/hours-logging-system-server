import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: number; // 0: BA, 1: Client, 2: Developer
  
  // Client/Developer specific fields
  billingType?: 'Hourly' | 'Fixed'; // For clients
  hourlyRate?: number; // For developers
  developerRole?: string; // For developers (different from user role)
  status?: 'Active' | 'Inactive'; // For clients/developers
  userId?: mongoose.Schema.Types.ObjectId; // For clients
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  role: {
    type: Number,
    enum: [0, 1, 2], // 0: BA, 1: Client, 2: Developer
    default: 0
  },
  billingType: {
    type: String,
    enum: ['Hourly', 'Fixed'],
    required: function() {
      return this.role === 1; // Only required for clients
    },
    default: 'Hourly'
  },
  hourlyRate: {
    type: Number,
    required: function() {
      return this.role === 2; // Only required for developers
    },
    min: [0, 'Hourly rate must be positive']
  },
  developerRole: {
    type: String,
    required: function() {
      return this.role === 2; // Only required for developers
    },
    trim: true,
    maxlength: [100, 'Role cannot exceed 100 characters']
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    required: function() {
      return [1, 2].includes(this.role); // Required for clients and developers
    },
    default: 'Active'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.role === 1; // Only required for clients
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
