import express from 'express';
import authRoutes from './authRoutes.js';
import readerApprovalRoutes from './readerApprovalRoutes.js';
import readerCallRoutes from './readerCallRoutes.js';
import dynamicAIManagementRoutes from './dynamicAIManagementRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/reader-approvals', readerApprovalRoutes);
router.use('/reader-calls', readerCallRoutes);
router.use('/dynamic-ai', dynamicAIManagementRoutes);


export default router; 