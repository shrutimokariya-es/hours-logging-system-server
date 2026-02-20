import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getDashboardSummary } from '../controllers/dashboardController';

const router = Router();

// GET /api/dashboard/summary - Get dashboard summary
router.get('/summary', authenticate, getDashboardSummary);

export { router as dashboardRoutes };
