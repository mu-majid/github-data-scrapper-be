const { body, param, query, validationResult } = require('express-validator');
const { handleValidationErrors } = require('../helpers/validationHelper') 

const validateGitHubIntegration = [
  body('access_token')
    .notEmpty()
    .isLength({ min: 10 })
    .withMessage('Valid access token required'),
    
  body('user_id')
    .isMongoId()
    .withMessage('Valid user ID required'),
    
  body('github_username')
    .trim()
    .isLength({ min: 1, max: 39 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$/)
    .withMessage('Invalid GitHub username format'),
    
  handleValidationErrors
];

// Collection data validation
const validateCollectionQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('search')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Search term too long'),
    
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'name', 'id'])
    .withMessage('Invalid sort field'),
    
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
    
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
    
  handleValidationErrors
];

module.exports = {
  validateObjectId,
  validateCollectionQuery,
  validateGitHubIntegration
}
