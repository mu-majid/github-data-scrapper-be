import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateToken } from '../helpers/jwtHelper.js';
const router = express.Router();

router.get('/github', authController.initiateGithubAuth.bind(authController)); // i don't like htis syntax but okay for the sake of the task
router.get('/github/callback', authController.handleGithubCallback);

router.get('/status', authenticateToken, authController.getAuthStatus);
router.post('/logout', authenticateToken, authController.logout);
router.delete('/remove', authenticateToken, authController.removeIntegration);
router.post('/verify', authenticateToken, authController.verifyToken);

export default router;