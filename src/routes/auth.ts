import { Router } from 'express';
import { login, register, getProfile } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/joiValidation';
import { loginSchema, registerSchema } from '../validators/authValidator';

const router = Router();

router.post('/login', validate(loginSchema), login);

router.post('/register', validate(registerSchema), register);

router.get('/profile', authenticate, getProfile);

export { router as authRoutes };
