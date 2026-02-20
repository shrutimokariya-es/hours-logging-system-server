import dotenv from 'dotenv';
dotenv.config();

export const envObj = {
RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
FRONTEND_URL: process.env.FRONTEND_URL,
NODE_ENV: process.env.NODE_ENV,
PORT:process.env.PORT,
MONGODB_URI:process.env.MONGODB_URI,
JWT_SECRET:process.env.JWT_SECRET,
JWT_EXPIRE:process.env.JWT_EXPIRE,
CLIPASS:process.env.CLIPASS,
DEVPASS:process.env.DEVPASS,
}
