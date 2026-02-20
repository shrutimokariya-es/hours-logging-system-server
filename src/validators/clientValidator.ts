import Joi from 'joi';

export const createClientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required'
  }),
  companyEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Company email is required'
  }),
  billingType: Joi.string().valid('Hourly', 'Fixed').required().messages({
    'any.only': 'Billing type must be Hourly or Fixed',
    'any.required': 'Billing type is required'
  }),
  status: Joi.string().valid('Active', 'Inactive').optional().messages({
    'any.only': 'Status must be Active or Inactive'
  })
});

export const updateClientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters'
  }),
  companyEmail: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid email'
  }),
  billingType: Joi.string().valid('Hourly', 'Fixed').optional().messages({
    'any.only': 'Billing type must be Hourly or Fixed'
  }),
  status: Joi.string().valid('Active', 'Inactive').optional().messages({
    'any.only': 'Status must be Active or Inactive'
  })
});
