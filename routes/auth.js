const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../helpers/jwtHelper');
const router = express.Router();

router.get('/github', authController.initiateGithubAuth.bind(authController)); // i don't like htis syntax but okay for the sake of the task
router.get('/github/callback', authController.handleGithubCallback);

router.get('/status', authenticateToken, authController.getAuthStatus);
router.post('/logout', authenticateToken, authController.logout);
router.delete('/remove', authenticateToken, authController.removeIntegration);
router.post('/verify', authenticateToken, authController.verifyToken);

module.exports = router;