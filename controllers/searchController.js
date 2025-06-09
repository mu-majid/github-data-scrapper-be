import { Organization, Repository, Commit, PullRequest, Issue, User } from '../models/GithubData.js';

import {
  flattenDocuments,
  buildSearchQuery,
  buildDateRangeQuery,
  buildCustomFilters
} from '../helpers/dataViewHelper.js';

import { getSearchableCollections } from '../helpers/githubHelper.js';

export const globalSearch = async (req, res) => {
  try {
    const modelMap = {
      'organizations': Organization,
      'repositories': Repository,
      'commits': Commit,
      'pulls': PullRequest,
      'issues': Issue,
      'users': User
    };
    const { query, page = 1, limit = 50, collections } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchCollections = collections ?
      collections.split(',') : getSearchableCollections();

    console.log('searchCollections ', searchCollections)

    const searchPromises = searchCollections.map(async (collectionName) => {
      try {
        const Model = modelMap[collectionName];
        if (!Model) {
          console.warn(`Model not found for collection: ${collectionName}`);
          return { collection: collectionName, count: 0, data: [], error: 'Model not found' };
        }
        const count = await Model.countDocuments({});
        if (count === 0) {
          return { collection: collectionName, count: 0, data: [] };
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        let searchQuery = buildSearchQuery(query); // can use getSearchFieldsForCollection(collectionName) as second param to use or instead of text index
        const searchResults = await Model
          .find(searchQuery, {_id: 0, __v:0})
          .skip(skip)
          .limit(parseInt(limit))
          .lean();
            console.log('global ssearch ', collectionName, searchQuery)

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