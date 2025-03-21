import express from 'express';
import adsTxtRoutes from './adsTxt';
import messageRoutes from './messages';
import requestRoutes from './requests';

const router = express.Router();

// API status check route
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    time: new Date().toISOString()
  });
});

// Mount sub-routers
router.use('/requests', requestRoutes);
router.use('/messages', messageRoutes);
router.use('/adstxt', adsTxtRoutes);

export default router;