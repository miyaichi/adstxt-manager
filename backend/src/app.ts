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
// Increase JSON request body size limit to 10MB to handle large ads.txt files
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
  const path = require('path');
  const fs = require('fs');
  
  // Define potential static file paths for the two hosting environments
  const potentialPaths = [
    process.env.STATIC_FILES_PATH, // First check environment variable if set
    path.join(__dirname, '/../public'), // Local development
    path.join(__dirname, '/../../frontend/build'), // Local development with frontend build
    path.join(__dirname, '/../../public'), // Project root
    '/home/ec2-user/adstxt-manager/public' // EC2 deployment path
  ].filter(Boolean); // Remove undefined entries
  
  // Find the first valid path
  let publicPath: string | null = null;
  
  for (const potentialPath of potentialPaths) {
    if (!potentialPath) continue;
    
    try {
      const stats = fs.statSync(potentialPath);
      if (stats.isDirectory()) {
        publicPath = potentialPath;
        // Check if index.html exists and is readable
        const indexPath = path.join(potentialPath, 'index.html');
        try {
          fs.accessSync(indexPath, fs.constants.R_OK);
          console.log(`Found valid static files path with index.html: ${potentialPath}`);
          console.log(`Permissions: ${stats.mode.toString(8)}`);
          break; // Found a valid path with index.html
        } catch (indexErr) {
          console.log(`Found directory but no readable index.html at: ${potentialPath}`);
        }
      }
    } catch (err) {
      console.log(`Static path not valid: ${potentialPath}`);
    }
  }
  
  if (!publicPath) {
    console.error('Could not find any valid static files path! Falling back to current directory.');
    publicPath = path.resolve('.');
  } else {
    console.log(`Using static files path: ${publicPath}`);
  }
  
  // Ensure publicPath is not null for TypeScript
  publicPath = publicPath || '';

  // Serve static files with options that maximize compatibility
  app.use(express.static(publicPath, { 
    maxAge: '1d',
    fallthrough: true,
    index: 'index.html',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Cache-Control', 'public, max-age=86400');
    }
  }));

  // For any request that doesn't match a static file or API route
  app.get('*', (req, res, next) => {
    // Skip API and status routes
    if (req.path.startsWith('/api/') || 
        req.path === '/status' || 
        req.path === '/health' ||
        req.path.includes('.hot-update.')) {
      return next();
    }
    
    const indexPath = path.join(publicPath, 'index.html');
    
    // Log the request to help with debugging
    console.log(`Serving SPA index.html for: ${req.url}`);
    
    // First try sendFile (most efficient)
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`Error serving index.html from ${indexPath}:`, err);
          
        // Second try readFile and send content
        try {
          const content = fs.readFileSync(indexPath, 'utf8');
          res.contentType('text/html').send(content);
          console.log(`Served index.html using readFile from: ${indexPath}`);
        } catch (readErr) {
          console.error(`Failed to read index.html:`, readErr);
            
          // If everything fails, send a basic HTML response
          res.status(200).contentType('text/html').send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Ads.txt Manager</title>
              <style>body{font-family:sans-serif;text-align:center;margin-top:50px}</style>
            </head>
            <body>
              <h1>Ads.txt Manager</h1>
              <p>Application is running but unable to load frontend resources.</p>
              <p>Please contact support if this issue persists.</p>
            </body>
            </html>
          `);
        }
      } else {
        console.log(`Successfully served index.html for: ${req.url}`);
      }
    });
  });
}

// Configure the right order of middleware
// First handle API routes and health checks
// Then serve static files
// Then use the notFoundHandler which may handle client-side routing
// Finally catch any errors with the error handler
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
