import { Response } from 'express';
import { User } from '../models';
import { AuthRequest } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendResponse } from '../utils/response';
import { envObj } from '../config/envConfig';

export const createClient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, companyEmail, billingType, status, password } = req.body;
console.log("req.user",req.body)
  // Only BA can create clients
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can create clients',
      statusCode: 403,
      toast:true,
      toastMessageFlag:true
    });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email:companyEmail });
  if (existingUser) {
    return sendResponse(res, {
      success: false,
      message: 'User with this email already exists',
      statusCode: 400,
      toast:true,
      toastMessageFlag:true
    });
  }

  const client = await User.create({
    name,    
    email: companyEmail ,
    billingType: billingType || 'Hourly',
    status: status || 'Active',
    role: 1, // Client role
    userId: req.user._id,
    password: password || envObj.CLIPASS || 'client123'
  });

  return sendResponse(res, {
    success: true,
    message: 'Client created successfully',
    statusCode: 201,
    data: { client },
      toast:true,
      toastMessageFlag:true
  });
});

export const getClients = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, status, search } = req.query;

  // Only BA can see all clients
  if (req.user.role !== 0) {
    return sendResponse(res, {
      success: false,
      message: 'Only BA can view clients',
      statusCode: 403
    });
  }

  const query: any = { 
    role: 1 // Only fetch clients
  };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const pageInt = parseInt(page as string);
  const limitInt = parseInt(limit as string);

  const clients = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(limitInt * 1)
    .skip((pageInt - 1) * limitInt)
    .exec();

  const total = await User.countDocuments(query);

  return sendResponse(res, {
    success: true,
    message: 'Clients retrieved successfully',
    data: {
      clients,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    }
  });
});

export const getClientById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  // const userId = req.user._id;
console.log("id",id)
  const client = await User.findOne({ _id: id, role: 1 });

  if (!client) {
    return sendResponse(res, {
      success: false,
      message: 'Client not found',
      statusCode: 404
    });
  }

  return sendResponse(res, {
    success: true,
    message: 'Client retrieved successfully',
    data: { client }
  });
});

export const updateClient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, companyEmail, billingType, status } = req.body;
  // const userId = req.user._id;

  const client = await User.findOneAndUpdate(
    { _id: id, role: 1 },
    { name, companyEmail, billingType, status },
    { new: true }
  );

  if (!client) {
    return sendResponse(res, {
      success: false,
      message: 'Client not found',
      statusCode: 404
    });
  }

  return sendResponse(res, {
    success: true,
    message: 'Client updated successfully',
    data: { client }
  });
});

export const deleteClient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  // const userId = req.user._id;
console.log("id",id)
  const client = await User.findOneAndUpdate(
    { _id: id, role: 1 },
    { status: 'Inactive' }, // Soft delete
    { new: true }
  );

  if (!client) {
    return sendResponse(res, {
      success: false,
      message: 'Client not found',
      statusCode: 404
    });
  }

  return sendResponse(res, {
    success: true,
    message: 'Client deleted successfully'
  });
});
