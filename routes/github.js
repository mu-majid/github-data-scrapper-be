import express from 'express';
import githubController from '../controllers/githubController.js';
import { requireAuth } from '../helpers/authHelper.js'
import GithubIntegration from '../models/GithubIntegration.js';
const router = express.Router();

router.use(requireAuth);

router.post('/sync', githubController.syncGithubData.bind(githubController));
router.post('/sync-jupyter', githubController.syncJupyterTestData.bind(githubController));  //for testing only

router.get('/sync-status', githubController.getSyncStatus.bind(githubController));
router.get('/rate-limit', githubController.getRateLimit.bind(githubController));
router.get('/organizations', githubController.getOrganizations.bind(githubController));
router.get('/validate-token', githubController.validateToken.bind(githubController));

export default router;