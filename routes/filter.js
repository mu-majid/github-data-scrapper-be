import express from 'express';
const router = express.Router();
import {getUserFilters,getFilter, createFilter, updateFilter, deleteFilter, toggleFilter, getActiveFiltersForCollection } from '../controllers/filterController.js';
import { requireAuth } from '../helpers/authHelper.js';

router.use(requireAuth);

router.get('/', getUserFilters);
router.get('/:id', getFilter);
router.post('/', createFilter);
router.put('/:id', updateFilter);
router.delete('/:id', deleteFilter);

router.patch('/:id/toggle', toggleFilter);
router.get('/collection/:collection', getActiveFiltersForCollection);

export default router;