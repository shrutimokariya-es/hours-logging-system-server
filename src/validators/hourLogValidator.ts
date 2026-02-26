import Joi from 'joi';

export const createHourLogSchema = Joi.object({
  client: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Valid client ID is required',
    'any.required': 'Client is required'
  }),
  developer: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Valid developer ID is required',
    'any.required': 'Developer is required'
  }),
  date: Joi.date().iso().required().messages({
    'date.format': 'Valid date is required (ISO 8601 format)',
    'any.required': 'Date is required'
  }),
  hours: Joi.number().min(0.5).max(24).custom((value, helpers) => {
    if (value % 0.5 !== 0) {
      return helpers.error('number.increment');
    }
    return value;
  }).required().messages({
    'number.min': 'Hours must be at least 0.5',
    'number.max': 'Hours cannot exceed 24',
    'number.increment': 'Hours must be in 0.5 hour increments',
    'any.required': 'Hours are required'
  }),
  description: Joi.string().trim().min(1).max(500).required().messages({
    'string.min': 'Description is required',
    'string.max': 'Description cannot exceed 500 characters',
    'any.required': 'Description is required'
  }),
  project: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Valid project ID is required',
    'any.required': 'Project is required'
  })
});

export const getHourLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be a positive integer'
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  }),
  clientId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
    'string.pattern.base': 'Valid client ID is required'
  }),
  developerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
    'string.pattern.base': 'Valid developer ID is required'
  }),
  startDate: Joi.date().iso().optional().messages({
    'date.format': 'Valid start date is required (ISO 8601 format)'
  }),
  endDate: Joi.date().iso().optional().messages({
    'date.format': 'Valid end date is required (ISO 8601 format)'
  })
});

export const getReportsSchema = Joi.object({
  startDate: Joi.date().iso().optional().messages({
    'date.format': 'Valid start date is required (ISO 8601 format)'
  }),
  endDate: Joi.date().iso().optional().messages({
    'date.format': 'Valid end date is required (ISO 8601 format)'
  }),
  clientId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
    'string.pattern.base': 'Valid client ID is required'
  }),
  developerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
    'string.pattern.base': 'Valid developer ID is required'
  }),
  reportType: Joi.string().valid('clients', 'developers', 'current-month', 'daily').optional().messages({
    'any.only': 'Report type must be clients, developers, current-month, or daily'
  })
});

export const importHourLogSchema = Joi.object({
  project: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Project name is required',
    'string.max': 'Project name cannot exceed 200 characters',
    'any.required': 'Project is required'
  }),
  clientName: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Client name is required',
    'string.max': 'Client name cannot exceed 200 characters',
    'any.required': 'Client name is required'
  }),
  developerName: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Developer name is required',
    'string.max': 'Developer name cannot exceed 200 characters',
    'any.required': 'Developer name is required'
  }),
  hours: Joi.number().min(0.5).max(24).required().messages({
    'number.min': 'Hours must be at least 0.5',
    'number.max': 'Hours cannot exceed 24',
    'any.required': 'Hours are required'
  }),
  date: Joi.string().isoDate().required().messages({
    'string.isoDate': 'Valid date is required (YYYY-MM-DD format)',
    'any.required': 'Date is required'
  }),
  description: Joi.string().trim().max(500).optional().allow('').messages({
    'string.max': 'Description cannot exceed 500 characters'
  })
});
