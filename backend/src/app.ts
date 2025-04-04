import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import i18nextMiddleware from 'i18next-http-middleware';
import swaggerUi from 'swagger-ui-express';
import { initializeDatabase } from './config/database';
import db from './config/database/index';
import { isCloudEnvironment } from './config/environment';
import i18next from './i18n';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import apiV1Routes from './api/v1/routes';
import { specs } from './api/v1/docs/swagger';

// Load environment variables
dotenv.config();

// Initialize the Express application
const app = express();

// Configure CORS based on environment
const corsOptions =
  process.env.NODE_ENV === 'production'
    ? {
        // In production, only allow same-origin requests or specified domains
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        optionsSuccessStatus: 204,
      }
    : {
        // In development, allow localhost origins
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        optionsSuccessStatus: 204,
      };

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(i18nextMiddleware.handle(i18next));

// Get filtered environment variables - exclude any containing secrets
const getFilteredEnvVars = () => {
  const filtered: Record<string, string> = {};
  const secretKeywords = ['key', 'secret', 'password', 'token', 'auth', 'credential'];

  Object.keys(process.env).forEach((key) => {
    // Skip variables that likely contain secrets
    const lowerKey = key.toLowerCase();
    if (!secretKeywords.some((secretWord) => lowerKey.includes(secretWord))) {
      filtered[key] = process.env[key] as string;
    }
  });

  return filtered;
};

// Status endpoint directly in app (both at API route and root route for flexibility)
const statusHandler = async (req: express.Request, res: express.Response) => {
  try {
    // Check database connection - use different approaches based on environment
    let dbConnected = false;
    try {
      if (isCloudEnvironment()) {
        // For cloud environments, use a compatible check method
        // that doesn't rely on raw SQL queries
        const result = await db.query('requests', { limit: 1 });
        // Connection is successful even if no records are returned
        dbConnected = true;
      } else {
        // For local/development environments (SQLite), use SQL query
        await db.execute('SELECT 1');
        dbConnected = true;
      }
    } catch (error) {
      console.error('Database connection check failed:', error);
    }

    res.status(200).json({
      status: dbConnected ? 'OK' : 'NG',
      time: new Date().toISOString(),
      database: {
        connected: dbConnected,
      },
      environment: getFilteredEnvVars(),
    });
  } catch (error) {
    console.error('Status endpoint error:', error);
    res.status(500).json({
      status: 'NG',
      time: new Date().toISOString(),
      error: 'Internal server error',
      environment: {},
    });
  }
};

// Mount the status handler at multiple paths for flexibility
app.get('/api/status', statusHandler);
app.get('/status', statusHandler);

// API routes
app.use('/api', apiRoutes);

// External API v1 routes
app.use('/api/v1', apiV1Routes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// One more status route at the top level, before 404 handler
app.get('/status', statusHandler);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = process.env.STATIC_FILES_PATH || __dirname + '/../public';
  console.log(`Serving static files from: ${publicPath}`);

  // Serve static files from the public directory
  app.use(express.static(publicPath));

  // For any other request, send the index.html file
  app.get('*', (req, res, next) => {
    // Skip API and status routes
    if (req.path.startsWith('/api/') || req.path === '/status' || req.path === '/health') {
      return next();
    }
    res.sendFile(publicPath + '/index.html');
  });
}

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database on application startup
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err: Error) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

export default app;
