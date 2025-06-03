const express = require('express');
const githubController = require('../controllers/githubController');
const { authenticateToken } = require('../helpers/jwtHelper');
const GithubIntegration = require('../models/GithubIntegration');
const router = express.Router();

const requireAuth = async (req, res, next) => {
  try {
    const integration = await GithubIntegration.findById(req.user.integrationId);
    if (!integration || !integration.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Valid GitHub integration required' 
      });
    }

    req.githubIntegration = integration;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

router.use(authenticateToken);
router.use(requireAuth);

router.post('/sync', githubController.syncGithubData.bind(githubController));
router.post('/sync-jupyter', githubController.syncJupyterTestData.bind(githubController));  //for testing only

router.get('/sync-status', githubController.getSyncStatus.bind(githubController));
router.get('/rate-limit', githubController.getRateLimit.bind(githubController));
router.get('/organizations', githubController.getOrganizations.bind(githubController));
router.get('/validate-token', githubController.validateToken.bind(githubController));

module.exports = router;