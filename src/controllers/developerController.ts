import { Response } from 'express';
import { User } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendResponse } from '../utils/response';
import { envObj } from '../config/envConfig';

export const createDeveloper = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, hourlyRate, status, password } = req.body;
  console.log("req.bodyb",req.body)

  // Only BA can create developers
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can create developers',
      statusCode: 403,
      toast:true,
      toastMessageFlag:true
    });
  }

  // Check if email already exists
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

  const developer = await User.create({
    name,
    email,
    hourlyRate,
    developerRole:'developer',
    status: status || 'Active',
    role: 2, // Developer role
    userId: req.user._id,
    password: password || envObj.DEVPASS || 'dev123'
  });

  return sendResponse(res, {
    success: true,
    message: 'Developer created successfully',
    statusCode: 201,
    data: { developer },
      toast:true,
      toastMessageFlag:true
  });
});

export const getDevelopers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, status, search } = req.query;

  // Only BA can see all developers
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can view developers',
      statusCode: 403
    });
  }

  const query: any = { 
    role: 2 // Only fetch developers
  };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const pageInt = parseInt(page as string);
  const limitInt = parseInt(limit as string);

  const developers = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(limitInt * 1)
    .skip((pageInt - 1) * limitInt)
    .exec();

  const total = await User.countDocuments(query);

  return sendResponse(res, {
    success: true,
    message: 'Developers retrieved successfully',
    data: {
      developers,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    }
  });
});

export const getDeveloperById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  // const userId = req.user._id;

  const developer = await User.findOne({ _id: id, role: 2 });

  if (!developer) {
    return sendResponse(res, {
      success: false,
      message: 'Developer not found',
      statusCode: 404
    });
  }

  return sendResponse(res, {
    success: true,
    message: 'Developer retrieved successfully',
    data: { developer }
  });
});

export const updateDeveloper = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, hourlyRate, role: developerRole, status } = req.body;
  // const userId = req.user._id;

  const developer = await User.findOneAndUpdate(
    { _id: id, role: 2 },
    { name, email, hourlyRate, developerRole, status },
    { new: true }
  );

  if (!developer) {
    return sendResponse(res, {
      success: false,
      message: 'Developer not found',
      statusCode: 404
    });
  }

  return sendResponse(res, {
    success: true,
    message: 'Developer updated successfully',
    data: { developer }
  });
});

export const deleteDeveloper = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  // const userId = req.user._id;

  const developer = await User.findOneAndUpdate(
    { _id: id, role: 2 },
    { status: 'Inactive' }, // Soft delete
    { new: true }
  );

  if (!developer) {
    return sendResponse(res, {
      success: false,
      message: 'Developer not found',
      statusCode: 404
    });
  }

  return sendResponse(res, {
    success: true,
    message: 'Developer deleted successfully'
  });
});
