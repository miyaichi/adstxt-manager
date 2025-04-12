import express from 'express';
import adsTxtRoutes from './adsTxt';
import messageRoutes from './messages';
import requestRoutes from './requests';
import sellersJsonRoutes from './sellersJson';
import adsTxtCacheRoutes from './adsTxtCache';
import contactRoutes from './contact';

const router = express.Router();

// Mount sub-routers
router.use('/requests', requestRoutes);
router.use('/messages', messageRoutes);
router.use('/adsTxt', adsTxtRoutes);
router.use('/sellersJson', sellersJsonRoutes);
router.use('/adsTxtCache', adsTxtCacheRoutes);
router.use('/contact', contactRoutes);

export default router;
