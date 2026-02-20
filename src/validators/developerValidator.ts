import Joi from 'joi';

export const createDeveloperSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required'
  }),
  hourlyRate: Joi.number().min(0).max(9999).required().messages({
    'number.min': 'Hourly rate cannot be negative',
    'number.max': 'Hourly rate cannot exceed 9999',
    'any.required': 'Hourly rate is required'
  }),
  role: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Role must be at least 2 characters long',
    'string.max': 'Role cannot exceed 50 characters',
    'any.required': 'Role is required'
  }),
  status: Joi.string().valid('Active', 'Inactive').optional().messages({
    'any.only': 'Status must be Active or Inactive'
  })
});

export const updateDeveloperSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid email'
  }),
  hourlyRate: Joi.number().min(0).max(9999).optional().messages({
    'number.min': 'Hourly rate cannot be negative',
    'number.max': 'Hourly rate cannot exceed 9999'
  }),
  role: Joi.string().trim().min(2).max(50).optional().messages({
    'string.min': 'Role must be at least 2 characters long',
    'string.max': 'Role cannot exceed 50 characters'
  }),
  status: Joi.string().valid('Active', 'Inactive').optional().messages({
    'any.only': 'Status must be Active or Inactive'
  })
});
