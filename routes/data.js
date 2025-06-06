import express from 'express';
import dataController from '../controllers/dataController.js';
import { requireAuth } from '../helpers/authHelper.js'
import { validateCollectionQuery } from '../validation/schema.js';

const router = express.Router();

router.use(requireAuth);

router.get('/collections', dataController.getCollections);
router.get('/collection/:collectionName', validateCollectionQuery, dataController.getCollectionData.bind(dataController));
router.get('/collection/:collectionName/fields', dataController.getCollectionFields.bind(dataController));
router.post('/collection/:collection/faceted-search', dataController.facetedSearch.bind(dataController));

export default router;