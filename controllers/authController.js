import axios from 'axios';
import GithubIntegration from '../models/GithubIntegration.js';
import { generateToken, generateState } from '../helpers/jwtHelper.js';
/**
 * Followed this link from github docs
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github
 */
const oauthStates = new Map(); // faster, maybe on prod -> redis or memcached

class AuthController {

  async initiateGithubAuth(req, res) {
    try {
      const state = generateState();
      oauthStates.set(state, {
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
      });
      this.cleanupExpiredStates();

      const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${process.env.GITHUB_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL)}&` +
        `scope=${encodeURIComponent('user:email read:org repo')}&` +
        `state=${state}`;  // protect against cross-site request forgery attacks. according to GH docs

      res.json({
        success: true,
        authUrl: githubAuthUrl,
        state
      });
    } catch (error) {
      console.error('GitHub OAuth initiation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error initiating GitHub OAuth'
      });
    }
  }

  async handleGithubCallback(req, res) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=no_code`);
      }

      if (!state || !oauthStates.has(state)) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=invalid_state`);
      }

      const stateData = oauthStates.get(state);
      if (Date.now() > stateData.expiresAt) {
        oauthStates.delete(state);
        return res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=state_expired`);
      }
      oauthStates.delete(state);

      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL
      }, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const { access_token, refresh_token } = tokenResponse.data;

      if (!access_token) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=no_access_token`);
      }

      const profileResponse = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${access_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const profile = profileResponse.data;
      let email = profile.email;
      if (!email) {
        try {
          const emailResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `token ${access_token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          const primaryEmail = emailResponse.data.find(e => e.primary);
          email = primaryEmail ? primaryEmail.email : null;
        }
        catch (emailError) {
          console.error('Error fetching user emails:', emailError.message);
        }
      }

      let integration = await GithubIntegration.findOne({ githubId: profile.id.toString() });

      if (integration) {
        integration.accessToken = access_token;
        integration.refreshToken = refresh_token;
        integration.username = profile.login;
        integration.email = email;
        integration.avatarUrl = profile.avatar_url;
        integration.profileUrl = profile.html_url;
        integration.lastSyncAt = new Date();
        integration.isActive = true;
        await integration.save();
      }
      else {
        integration = new GithubIntegration({
          userId: `user_${profile.id}`,
          username: profile.login,
          accessToken: access_token,
          refreshToken: refresh_token,
          githubId: profile.id.toString(),
          email: email,
          avatarUrl: profile.avatar_url,
          profileUrl: profile.html_url,
          connectedAt: new Date(),
          lastSyncAt: new Date(),
          isActive: true
        });
        await integration.save();
      }
      const token = generateToken({
        integrationId: integration._id,
        userId: integration.userId,
        githubId: integration.githubId,
        username: integration.username
      });

      res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);

    } 
    catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=callback_error`);
    }
  }

  async getAuthStatus(req, res) {
    try {
      const integration = await GithubIntegration.findById(req.user.integrationId);

      if (!integration || !integration.isActive) {
        return res.status(401).json({
          success: false,
          authenticated: false,
          message: 'Integration not found or inactive'
        });
      }

      res.json({
        success: true,
        authenticated: true,
        integration: {
          id: integration._id,
          username: integration.username,
          email: integration.email,
          avatarUrl: integration.avatarUrl,
          connectedAt: integration.connectedAt,
          lastSyncAt: integration.lastSyncAt
        }
      });
    } 
    catch (error) {
      console.error('Auth status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking authentication status'
      });
    }
  }

  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logged out successfully. Please discard your token.' // (client should discard token)
    });
  }

  async removeIntegration(req, res) {
    try {
      const integration = await GithubIntegration.findById(req.user.integrationId);

      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }

      await GithubIntegration.findByIdAndDelete(integration._id);

      res.json({
        success: true,
        message: 'Integration removed successfully'
      });
    } 
    catch (error) {
      console.error('Remove integration error:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing integration'
      });
    }
  }

  async verifyToken(req, res) {
    res.json({
      success: true,
      valid: true,
      user: {
        integrationId: req.user.integrationId,
        userId: req.user.userId,
        githubId: req.user.githubId,
        username: req.user.username
      }
    });
  }

  cleanupExpiredStates() {
    const now = Date.now();
    for (const [state, data] of oauthStates.entries()) {
      if (now > data.expiresAt) {
        oauthStates.delete(state);
      }
    }
  }
}

// Cleanup expired states every 10 minutes
setInterval(() => {
  const controller = new AuthController();
  controller.cleanupExpiredStates();
}, 10 * 60 * 1000);

export default new AuthController();