import { Organization, Repository, Commit, PullRequest, Issue, User } from '../models/GithubData.js';

import {
  flattenDocuments,
  buildSearchQuery,
  buildDateRangeQuery,
  buildCustomFilters
} from '../helpers/dataViewHelper.js';

import { getSearchableCollections } from '../helpers/githubHelper.js';

const modelMap = {
  'organizations': Organization,
  'repositories': Repository,
  'commits': Commit,
  'pulls': PullRequest,
  'issues': Issue,
  'users': User
};

export const globalSearch = async (req, res) => {
  try {
    const { query, page = 1, limit = 50, collections } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchCollections = collections ?
      collections.split(',') : getSearchableCollections();

    const searchPromises = searchCollections.map(async (collectionName) => {
      try {
        const Model = modelMap[collectionName];
        if (!Model) {
          console.warn(`Model not found for collection: ${collectionName}`);
          return { collection: collectionName, count: 0, data: [], error: 'Model not found' };
        }

        // Check if collection has documents
        const count = await Model.countDocuments({});
        if (count === 0) {
          return { collection: collectionName, count: 0, data: [] };
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        let searchQuery = buildSearchQuery(query); // can use getSearchFieldsForCollection(collectionName) as second param to use or instead of text index
        const searchResults = await Model
          .find(searchQuery)
          .skip(skip)
          .limit(parseInt(limit))
          .lean();

        return {
          collection: collectionName,
          count: searchResults.length,
          data: flattenDocuments(searchResults)
        };
      } catch (collectionError) {
        console.warn(`Error searching in ${collectionName}:`, collectionError.message);
        return {
          collection: collectionName,
          count: 0,
          data: [],
          error: collectionError.message
        };
      }
    });

    const results = await Promise.all(searchPromises);
    const totalResults = results.reduce((sum, result) => sum + result.count, 0);

    res.json({
      success: true,
      query,
      results: results.filter(result => result.count > 0 || result.error),
      totalCollections: searchCollections.length,
      totalResults,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      error: 'Global search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const advancedFilter = async (req, res) => {
  try {
    const { name: collectionName } = req.params;
    const {
      filters = {},
      dateRange,
      search,
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = 'asc'
    } = req.body;

    const Model = modelMap[collectionName];
    if (!Model) {
      return res.status(404).json({
        success: false,
        error: `Collection '${collectionName}' not found`
      });
    }

    let query = {};

    const customFiltersQuery = buildCustomFilters(filters);
    Object.assign(query, customFiltersQuery);

    const dateQuery = buildDateRangeQuery(dateRange);
    if (Object.keys(dateQuery).length > 0) {
      query = { ...query, ...dateQuery };
    }

    // Apply text search
    if (search && search.trim()) {
      const searchQuery = buildSearchQuery(search);
      query = { ...query, ...searchQuery };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Sorting
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort = { _id: -1 }; // Default sort by _id descending
    }

    const [results, total] = await Promise.all([
      Model.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Model.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: flattenDocuments(results),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limitNum),
        count: results.length,
        totalRecords: total,
        hasNext: skip + results.length < total,
        hasPrev: parseInt(page) > 1
      },
      appliedFilters: {
        filters,
        dateRange,
        search,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Advanced filter error:', error);
    res.status(500).json({
      success: false,
      error: 'Filter operation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const smartSearch = async (req, res) => {
  try {
    const { query, collection: collectionName, page = 1, limit = 50 } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const Model = modelMap[collectionName];
    if (!Model) {
      return res.status(404).json({
        success: false,
        error: `Collection '${collectionName}' not found`
      });
    }

    const sampleDoc = await Model.findOne({}).lean();
    if (!sampleDoc) {
      return res.json({
        success: true,
        data: [],
        totalResults: 0,
        message: 'Collection is empty'
      });
    }

    const searchableFields = extractSearchableFields(sampleDoc);
    const searchQuery = {
      $or: searchableFields.map(field => ({
        [field]: { $regex: query, $options: 'i' }
      }))
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [results, total] = await Promise.all([
      Model.find(searchQuery).skip(skip).limit(parseInt(limit)).lean(),
      Model.countDocuments(searchQuery)
    ]);

    res.json({
      success: true,
      query,
      collection: collectionName,
      data: flattenDocuments(results),
      searchedFields: searchableFields,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: results.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Smart search error:', error);
    res.status(500).json({
      success: false,
      error: 'Smart search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to get search fields based on collection type
const getSearchFieldsForCollection = (collectionName) => {
  const fieldMap = {
    'organizations': ['name', 'description', 'login', 'email'],
    'repositories': ['name', 'description', 'full_name'],
    'commits': ['commit.message', 'commit.author.name', 'commit.committer.name'],
    'pulls': ['title', 'body', 'head.ref', 'base.ref'],
    'issues': ['title', 'body', 'labels.name'],
    'users': ['name', 'login', 'email', 'bio']
  };

  return fieldMap[collectionName] || ['name', 'title', 'description'];
};

// Helper function to extract searchable fields from document
const extractSearchableFields = (document, prefix = '', maxDepth = 3) => {
  const fields = [];

  if (maxDepth <= 0) return fields;

  const processValue = (key, value, currentPrefix) => {
    const fieldName = currentPrefix ? `${currentPrefix}.${key}` : key;

    if (typeof value === 'string') {
      fields.push(fieldName);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively process nested objects
      fields.push(...extractSearchableFields(value, fieldName, maxDepth - 1));
    }
  };

  Object.entries(document).forEach(([key, value]) => {
    processValue(key, value, prefix);
  });

  return fields;
};