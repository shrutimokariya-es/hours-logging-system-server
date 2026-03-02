import { Router } from 'express';
import { getPredictiveInsights } from '../controllers/analyticsController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/insights', authenticate, getPredictiveInsights);

export { router as analyticsRoutes };