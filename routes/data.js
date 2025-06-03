import express from 'express';
import dataController from '../controllers/dataController.js';
import { requireAuth } from '../helpers/authHelper.js'
import { validateCollectionQuery } from '../validation/schema.js';

const router = express.Router();

router.use(requireAuth);

router.get('/collections', dataController.getCollections);
router.get('/collection/:collectionName', validateCollectionQuery, dataController.getCollectionData);
router.get('/collection/:collectionName/fields', dataController.getCollectionFields.bind(dataController));
router.get('/collection/:collectionName/stats', dataController.getCollectionStats);
router.delete('/collection/:collectionName/record/:recordId', dataController.deleteRecord);
router.delete('/collection/:collectionName/clear', dataController.clearCollection);
router.get('/search', dataController.searchAllCollections);

export default router;