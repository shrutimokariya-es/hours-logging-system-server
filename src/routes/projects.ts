import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { 
  createProject, 
  getProjects, 
  getProjectById, 
  updateProject, 
  deleteProject,
  getProjectStats 
} from '../controllers/projectController';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/stats', getProjectStats);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export { router as projectRoutes };
