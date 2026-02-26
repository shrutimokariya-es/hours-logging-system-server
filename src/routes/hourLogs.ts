import { Router } from 'express';
import {
  createHourLog,
  getHourLogs,
  getReports,
  importHourLog
} from '../controllers/hourLogController';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/joiValidation';
import { 
  createHourLogSchema, 
  getHourLogsSchema, 
  getReportsSchema,
  importHourLogSchema
} from '../validators/hourLogValidator';

const router = Router();

router.use(authenticate);

router.post('/', authorize([0, 2]), validate(createHourLogSchema), createHourLog);

router.post('/import', authorize([0]), validate(importHourLogSchema), importHourLog);

router.get('/', authorize([0, 1, 2]), validate(getHourLogsSchema, 'query'), getHourLogs);

router.get('/project/:projectId', authorize([0, 1, 2]), validate(getHourLogsSchema, 'query'), getHourLogs);

router.get('/reports', authorize([0, 1, 2]), validate(getReportsSchema, 'query'), getReports);

export { router as hourLogRoutes };
