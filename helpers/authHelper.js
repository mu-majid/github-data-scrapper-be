import GithubIntegration from '../models/GithubIntegration.js';
import { authenticateToken } from './jwtHelper.js';

export const isAuthenticated = async (req) => {
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

export const requireAuth = [
  authenticateToken,
  async (req, res, next) => {
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
  }
];
