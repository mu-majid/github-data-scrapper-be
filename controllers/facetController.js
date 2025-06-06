import { Organization, Repository, Commit, PullRequest, Issue, User } from '../models/GithubData.js';
import Filter from '../models/Filter.js'

const modelMap = {
  'organizations': Organization,
  'repositories': Repository,
  'commits': Commit,
  'pulls': PullRequest,
  'issues': Issue,
  'users': User
}
/**
 * Get facet values with counts for a specific field in a collection
 */
export const getFacetValues = async (req, res, next) => {
  try {
    const { collection, field } = req.params;
    const { limit = 50 } = req.query;


    const Model = modelMap[collection];
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection name'
      });
    }
    const pipeline = [
      { $match: { [field]: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ];

    const facetValues = await Model.aggregate(pipeline);

    res.json({
      success: true,
      field,
      values: facetValues.map(item => ({
        value: item._id,
        count: item.count
      }))
    });

  } catch (error) {
    console.error('Error getting facet values:', error);
    next(error);
  }
};

/**
 * Get multiple facets for a collection
 */
export const getCollectionFacets = async (req, res, next) => {
  try {
    const { collection } = req.params;
    const { fields } = req.query;

    if (!fields) {
      return res.status(400).json({
        success: false,
        error: 'Fields parameter is required'
      });
    }

    const fieldList = fields.split(',').map(f => f.trim());
    const Model = modelMap[collection];
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection name'
      });
    }
    // Build dynamic facet aggregation
    const facetStages = {};

    fieldList.forEach(field => {
      facetStages[field] = [
        { $match: { [field]: { $exists: true, $ne: null } } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ];
    });

    const pipeline = [
      { $facet: facetStages }
    ];

    const result = await Model.aggregate(pipeline);
    const facets = result[0];

    const formattedFacets = {};
    Object.keys(facets).forEach(field => {
      formattedFacets[field] = facets[field].map(item => ({
        value: item._id,
        count: item.count
      }));
    });

    res.json({
      success: true,
      facets: formattedFacets
    });

  } catch (error) {
    console.error('Error getting collection facets:', error);
    next(error);
  }
};