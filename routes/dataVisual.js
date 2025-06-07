
import express from 'express';
import DataVisualizationController from '../controllers/dataVisualisationController.js'
const router = express.Router();


// Input validation middleware
const validateInput = (req, res, next) => {
  const errors = [];

  if (req.query.page && (!Number.isInteger(+req.query.page) || +req.query.page < 1)) {
    errors.push('Page must be a positive integer');
  }

  if (req.query.limit) {
    const limit = +req.query.limit;
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      errors.push('Limit must be an integer between 1 and 1000');
    }
  }

  if (req.query.date_from && isNaN(Date.parse(req.query.date_from))) {
    errors.push('date_from must be a valid ISO date string');
  }

  if (req.query.date_to && isNaN(Date.parse(req.query.date_to))) {
    errors.push('date_to must be a valid ISO date string');
  }

  const validSortOrders = ['asc', 'desc'];
  if (req.query.sort_order && !validSortOrders.includes(req.query.sort_order)) {
    errors.push('sort_order must be either "asc" or "desc"');
  }

  const validStatuses = ['open', 'closed', 'merged'];
  if (req.query.status && !validStatuses.includes(req.query.status)) {
    errors.push('status must be one of: open, closed, merged');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors
    });
  }

  next();
};

/**
 * @route GET /api/data-visualization/repository
 * @desc Get repository data with related commits, pull requests, and issues
 * @query {string} repositoryId - Repository ID (required)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 1000)
 * @query {string} sort_by - Sort field (default: 'createdAt')
 * @query {string} sort_order - Sort direction: 'asc' or 'desc' (default: 'desc')
 * @query {string} date_from - Filter from date (ISO format)
 * @query {string} date_to - Filter to date (ISO format)
 * @query {string} author - Filter by author username
 * @query {string} status - Filter by status ('open', 'closed', 'merged')
 */
router.get('/repository', validateInput, DataVisualizationController.getRepositoryData.bind(DataVisualizationController));

export default router;