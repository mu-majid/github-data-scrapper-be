import express from 'express';
import githubController from '../controllers/githubController.js';
import { requireAuth } from '../helpers/authHelper.js'
const router = express.Router();

router.use(requireAuth);

router.post('/sync', githubController.syncGithubData);
router.get('/sync-status', githubController.getSyncStatus);
router.post('/sync-jupyter', githubController.syncJupyterTestData);  //for testing only

export default router;