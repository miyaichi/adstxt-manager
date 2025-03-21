import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { initializeDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRoutes from './routes';

// Load environment variables
dotenv.config();

// Initialize the Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database on application startup
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

export default app;