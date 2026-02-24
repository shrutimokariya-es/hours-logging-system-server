import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';


import { connectDB } from './config/database';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { requestLogger } from './utils/logger';
import { authRoutes } from './routes/auth';
import { clientRoutes } from './routes/clients';
import { developerRoutes } from './routes/developers';
import { hourLogRoutes } from './routes/hourLogs';
import { dashboardRoutes } from './routes/dashboard';
import { reportRoutes } from './routes/reports';
import { projectRoutes } from './routes/projects';
import { envObj } from './config/envConfig';

const app = express();

connectDB();

app.use(helmet());

app.use(cors({
  origin: envObj.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: parseInt(envObj.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(envObj.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use(compression());

app.use(morgan('combined'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: envObj.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/hour-logs', hourLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFound);

app.use(errorHandler);

export { app };
