import express from 'express';
import { globalSearch, advancedFilter } from '../controllers/searchController.js';
import { requireAuth } from '../helpers/authHelper.js';
const router = express.Router();

router.use(requireAuth);
router.get('/global', globalSearch);
router.post('/collection/:name/filter', advancedFilter);

export default router;