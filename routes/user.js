import express from 'express';
import { findUser, getUserActivity } from '../controllers/userController.js';
import { requireAuth } from '../helpers/authHelper.js';

const router = express.Router();

router.use(requireAuth);
router.get('/find/:ticketId', findUser);
router.get('/activity/:userId', getUserActivity);

export default router;