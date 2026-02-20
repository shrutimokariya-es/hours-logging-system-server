import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { envObj } from './envConfig';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = envObj.MONGODB_URI || 'mongodb://127.0.0.1:27017/hours-logging-system';
    console.log("???????????????/",mongoURI)
    const conn = await mongoose.connect(mongoURI);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

export { connectDB };
