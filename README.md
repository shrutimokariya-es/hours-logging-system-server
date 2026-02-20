# Hours Logging System - Backend

A production-ready Node.js, Express, and TypeScript backend for the Client Hour Logging System.

## 🚀 Features

- **TypeScript** with strict type checking
- **Express.js** with modern middleware
- **MongoDB** with Mongoose ODM
- **JWT Authentication** with secure password hashing
- **Input Validation** using express-validator
- **Error Handling** with comprehensive error middleware
- **Security** with Helmet, CORS, and rate limiting
- **Logging** with structured request/response logging
- **Environment Configuration** with dotenv
- **Production Ready** with compression and security headers

## 📁 Project Structure

```
src/
├── config/         # Database configuration
├── controllers/    # Route handlers
├── middlewares/    # Custom middlewares
├── models/         # MongoDB models
├── routes/         # API routes
├── utils/          # Helper functions
├── app.ts          # Express app setup
└── server.ts       # Server entry point
```

## 🛠 Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/hours-logging-system
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

## 🏃‍♂️ Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile (protected)

### Health Check
- `GET /api/health` - Server health status

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Sanitize and validate all inputs
- **Password Hashing**: bcrypt with salt rounds
- **JWT**: Secure token-based authentication
- **Error Handling**: Prevent information leakage

## 🧪 Development

### Linting
```bash
npm run lint
npm run lint:fix
```

### Testing
```bash
npm test
npm run test:watch
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/hours-logging-system` |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | JWT expiration | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## 🚀 Deployment

### PM2 (Recommended)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

### Docker
```bash
docker build -t hours-logging-backend .
docker run -p 5000:5000 --env-file .env hours-logging-backend
```

## 📊 Monitoring

The application includes:
- Request/response logging
- Error tracking
- Health check endpoint
- Graceful shutdown handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
