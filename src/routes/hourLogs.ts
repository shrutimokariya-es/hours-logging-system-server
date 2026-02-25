import { Router } from 'express';
import {
  createHourLog,
  getHourLogs,
  getReports
} from '../controllers/hourLogController';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/joiValidation';
import { 
  createHourLogSchema, 
  getHourLogsSchema, 
  getReportsSchema 
} from '../validators/hourLogValidator';

const router = Router();

router.use(authenticate);
router.use(authorize([0, 2])); // 0: BA, 2: Developer - both can create hour logs

router.post('/', validate(createHourLogSchema), createHourLog);

router.get('/', validate(getHourLogsSchema, 'query'), getHourLogs);

router.get('/project/:projectId', validate(getHourLogsSchema, 'query'), getHourLogs);

router.get('/reports', validate(getReportsSchema, 'query'), getReports);

export { router as hourLogRoutes };
