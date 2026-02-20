import { Router } from 'express';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient
} from '../controllers/clientController';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/joiValidation';
import { createClientSchema, updateClientSchema } from '../validators/clientValidator';

const router = Router();

router.use(authenticate);
router.use(authorize([0])); // 0: BA

router.post('/', validate(createClientSchema), createClient);

router.get('/', getClients);

router.get('/:id', getClientById);

router.put('/:id', validate(updateClientSchema), updateClient);

router.delete('/:id', deleteClient);

export { router as clientRoutes };
