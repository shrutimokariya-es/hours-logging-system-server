import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import {
  generateReport,
  getAllReports,
  getReportById,
  deleteReport,
  getReportStats,
  getClientHours,
  getDeveloperHours,
  getHoursSummary
} from '../controllers/reportController';
import { Types } from 'mongoose';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Generate new report
router.post('/', generateReport);

// Get all reports
router.get('/', getAllReports);


// Delete report
router.delete('/:id', deleteReport);

// Get report statistics
router.get('/stats/summary', getReportStats);

// Get client hours data
router.get('/clients/hours', getClientHours);

// Get developer hours data
router.get('/developers/hours', getDeveloperHours);

// Get combined hours summary
router.get('/hours-summary', getHoursSummary);
// Get report by ID
router.get('/:id', getReportById);

export { router as reportRoutes };
