import express from 'express';
import githubController from '../controllers/githubController.js';
import { requireAuth } from '../helpers/authHelper.js'
const router = express.Router();

router.use(requireAuth);

router.post('/sync', githubController.syncGithubData);
router.post('/sync-jupyter', githubController.syncJupyterTestData);  //for testing only

router.get('/sync-status', githubController.getSyncStatus);
router.get('/rate-limit', githubController.getRateLimit);
router.get('/organizations', githubController.getOrganizations);
router.get('/validate-token', githubController.validateToken);

export default router;