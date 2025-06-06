import express from 'express';
import { getFacetValues, getCollectionFacets } from '../controllers/facetController.js';
import { requireAuth } from '../helpers/authHelper.js';


const router = express.Router();
router.use(requireAuth);

router.get('/:collection/field/:field', getFacetValues);
router.get('/:collection', getCollectionFacets);

export default router;