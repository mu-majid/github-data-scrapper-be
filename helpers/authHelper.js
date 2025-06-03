const GithubIntegration = require('../models/GithubIntegration');
const { authenticateToken } = require('./jwtHelper');

/**
 * Check if user is authenticated and has valid GitHub integration
 */
const isAuthenticated = async (req) => {
  try {
    if (!req.user?.integrationId) {
      return { success: false, message: 'Not authenticated' };
    }

    const integration = await GithubIntegration.findById(req.user.integrationId);
    if (!integration || !integration.isActive) {
      return { success: false, message: 'Valid GitHub integration required' };
    }

    return { success: true, integration };
  } catch (error) {
    console.error('Authentication check error:', error);
    return { success: false, message: 'Authentication error' };
  }
};

/**
 * Middleware to require authentication (combines JWT auth + integration check)
 */
const requireAuth = [
  authenticateToken,
  async (req, res, next) => {
    const authResult = await isAuthenticated(req);
    
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message
      });
    }

    req.githubIntegration = authResult.integration;
    next();
  }
];

/**
 * Get user's GitHub access token
 */
const getAccessToken = async (req) => {
  const authResult = await isAuthenticated(req);
  
  if (!authResult.success) {
    return null;
  }

  return authResult.integration.accessToken;
};

/**
 * Update integration last sync time
 */
const updateLastSync = async (integrationId) => {
  try {
    await GithubIntegration.findByIdAndUpdate(integrationId, {
      lastSyncAt: new Date()
    });
  } catch (error) {
    console.error('Error updating last sync time:', error);
  }
};

module.exports = {
  isAuthenticated,
  requireAuth,
  getAccessToken,
  updateLastSync
};