const express = require('express');
const dataController = require('../controllers/dataController');
const { authenticateToken } = require('../helpers/jwtHelper');
const GithubIntegration = require('../models/GithubIntegration');
const { validateCollectionQuery } = require('../validation/schema');

const router = express.Router();

// Middleware to check authentication and get GitHub integration
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

router.get('/collections', dataController.getCollections);
router.get('/collection/:collectionName', validateCollectionQuery, dataController.getCollectionData);
router.get('/collection/:collectionName/fields', dataController.getCollectionFields.bind(dataController));
router.get('/collection/:collectionName/stats', dataController.getCollectionStats);
router.delete('/collection/:collectionName/record/:recordId', dataController.deleteRecord);
router.delete('/collection/:collectionName/clear', dataController.clearCollection);
router.get('/search', dataController.searchAllCollections);

module.exports = router;