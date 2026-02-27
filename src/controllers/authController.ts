import { Response } from 'express';
import { User } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendResponse } from '../utils/response';
import jwt, { SignOptions } from 'jsonwebtoken';
import { envObj } from '../config/envConfig';

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  // 1. Check if email and password are provided
  if (!email || !password) {
    return sendResponse(res, {
      success: false,
      message: 'Please provide an email and password',
      statusCode: 400,
      toastMessageFlag: true,
      toast: true
    });
  }

  // 2. Check for user and include password for comparison
  // We use .select('+password') because it is likely hidden by default in the schema
  const user = await User.findOne({ email }).select('+password');
  
  // 3. Validate user existence and password match
  // The comparePassword method should be defined in your User schema
  if (!user || !(await user.comparePassword(password))) {
    return sendResponse(res, {
      success: false,
      message: 'Invalid email or password',
      statusCode: 401,
      toastMessageFlag: true,
      toast: true
    });
  }

  // 4. Generate JWT Token
const token = jwt.sign(
  { userId: user._id },
  envObj.JWT_SECRET!,
  { 
    // Cast the string to any or SignOptions['expiresIn'] to satisfy the overload
    expiresIn: (envObj.JWT_EXPIRE || '7d') as SignOptions['expiresIn']
  });

  // 5. Send Success Response
  return sendResponse(res, {
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    },
    toastMessageFlag: true,
    toast: true
  });
});

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password } = req.body;

  // Check if any users already exist
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    return sendResponse(res, {
      success: false,
      message: 'Registration is closed. Please contact your administrator.',
      statusCode: 403,
      toast:true,
      toastMessageFlag:
        true
       });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendResponse(res, {
      success: false,
      message: 'User with this email already exists',
      statusCode: 400,
      toast:true,
      toastMessageFlag:true
    });
  }

  // Create the first user as BA (Business Analyst) admin
  const user = await User.create({
    name,
    email,
    password,
    role: 0 // BA role
  });

  const token = jwt.sign(
    { userId: user._id },
    envObj.JWT_SECRET!,
    { expiresIn: envObj.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );

  return sendResponse(res, {
    success: true,
    message: 'Registration successful - BA admin account created',
    statusCode: 201,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    },
    toast:true
  });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);
  
  return sendResponse(res, {
    success: true,
    data: {
      user: {
        id: user!._id,
        name: user!.name,
        email: user!.email,
        role: user!.role,
        createdAt: (user as any).createdAt
      }
    }
  });
});
