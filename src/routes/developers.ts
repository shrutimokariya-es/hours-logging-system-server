import { Router } from 'express';
import {
  createDeveloper,
  getDevelopers,
  getDeveloperById,
  updateDeveloper,
  deleteDeveloper
} from '../controllers/developerController';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/joiValidation';
import { createDeveloperSchema, updateDeveloperSchema } from '../validators/developerValidator';

const router = Router();

router.use(authenticate);
router.use(authorize([0])); // 0: BA

router.post('/', validate(createDeveloperSchema), createDeveloper);

router.get('/', getDevelopers);

router.get('/:id', getDeveloperById);

router.put('/:id', validate(updateDeveloperSchema), updateDeveloper);

router.delete('/:id', deleteDeveloper);

export { router as developerRoutes };
