import express from 'express';
import adsTxtRoutes from './adsTxt';
import messageRoutes from './messages';
import requestRoutes from './requests';
import sellersJsonRoutes from './sellersJson';
import adsTxtCacheRoutes from './adsTxtCache';
import contactRoutes from './contact';
import openSinceraRoutes from './openSincera';
import domainRoutes from './domains';

const router = express.Router();

// Mount sub-routers
router.use('/requests', requestRoutes);
router.use('/messages', messageRoutes);
router.use('/adsTxt', adsTxtRoutes);
router.use('/sellersJson', sellersJsonRoutes);
router.use('/adsTxtCache', adsTxtCacheRoutes);
router.use('/contact', contactRoutes);
router.use('/opensincera', openSinceraRoutes);
router.use('/domains', domainRoutes);

export default router;
