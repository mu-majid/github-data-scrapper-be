import { Organization, Repository, Commit, PullRequest, Issue, User } from '../models/GithubData.js';
import Filter from '../models/Filter.js'
import { extractAllFields, extractAllFieldsFromDocument, flattenDocumentForResponse } from '../helpers/dataViewHelper.js';

class DataController {

  async getCollections(req, res) {
    try {
      const collections = [
        { name: 'organizations', label: 'Organizations', model: Organization },
        { name: 'repositories', label: 'Repositories', model: Repository },
        { name: 'commits', label: 'Commits', model: Commit },
        { name: 'pulls', label: 'Pull Requests', model: PullRequest },
        { name: 'issues', label: 'Issues', model: Issue },
        { name: 'users', label: 'Users', model: User }
      ];

      const collectionsWithCounts = await Promise.all(
        collections.map(async (collection) => {
          const count = await collection.model.countDocuments({
            userId: req.githubIntegration.userId
          });
          return {
            name: collection.name,
            label: collection.label,
            count
          };
        })
      );

      res.json({
        success: true,
        collections: collectionsWithCounts
      });

    } catch (error) {
      console.error('Collections error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching collections'
      });
    }
  }

  applyFiltersToQuery(query, filters) {
    if (!filters || !filters.length) return query;

    const filter = filters[0];

    // Apply date range filter
    if (filter.filters.dateRange) {
      const { field, startDate, endDate } = filter.filters.dateRange;
      query[field] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Apply status filter
    if (filter.filters.status.field && filter.filters.status.values.length > 0) {
      const { field, values } = filter.filters.status;
      query[field] = { $in: values };
    }

    // Apply custom field filters
    if (filter.filters.customFields && filter.filters.customFields.length > 0) {
      filter.filters.customFields.forEach(({ field, operator, value }) => {
        // field = field.replace('_', '.')
        switch (operator) {
          case 'equals':
            query[field] = value;
            break;
          case 'contains':
            query[field] = { $regex: value, $options: 'i' };
            break;
          case 'startsWith':
            query[field] = { $regex: `^${value}`, $options: 'i' };
            break;
          case 'endsWith':
            query[field] = { $regex: `${value}$`, $options: 'i' };
            break;
          case 'greaterThan':
            query[field] = { $gt: value };
            break;
          case 'lessThan':
            query[field] = { $lt: value };
            break;
          case 'in':
            query[field] = { $in: value };
            break;
          case 'notIn':
            query[field] = { $nin: value };
            break;
        }
      });
    }

    return query;
  };

  buildFacetedQuery(baseQuery, facets) {
    console.log('baseQuery ',baseQuery)
    if (!facets || typeof facets !== 'object') {
    console.log('next')

      return baseQuery;
    }

    const query = { ...baseQuery, ...facets };

    // Object.keys(facets).forEach(field => {
    //   const facetFilter = facets[field];

    //   console.log('next facetFilter', facetFilter)
    //   if (!facetFilter) return;

    //   // Handle different types of facet filters
    //   if (facetFilter.values && Array.isArray(facetFilter.values) && facetFilter.values.length > 0) {
    //     // Multiple value selection
    //     query[field] = { $in: facetFilter.values };
    //   } else if (facetFilter.range) {
    //     // Range filter (for dates and numbers)
    //     query[field] = {};
    //     if (facetFilter.range.min !== undefined) {
    //       query[field].$gte = facetFilter.range.min;
    //     }
    //     if (facetFilter.range.max !== undefined) {
    //       query[field].$lte = facetFilter.range.max;
    //     }
    //   } else if (facetFilter.value !== undefined) {
    //     // Single value selection
    //     query[field] = facetFilter.value;
    //   }
    // });

    return query;
  };

  async getCollectionData(req, res) {
    try {
      const modelMap = {
        'organizations': Organization,
        'repositories': Repository,
        'commits': Commit,
        'pulls': PullRequest,
        'issues': Issue,
        'users': User
      };
      const { collectionName } = req.params;
      const { page = 1, limit = 50, search = '', sortBy = 'createdAt', sortOrder = 'desc', activeFilterId, facetQuery } = req.query;
      const Model = modelMap[collectionName];
      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'Invalid collection name'
        });
      }

      let query = { userId: req.githubIntegration.userId };
      if (activeFilterId) {
        const activeFilter = await Filter.findOne({
          _id: activeFilterId,
          userId: req.githubIntegration.userId,
          collection: collectionName,
          isActive: true
        }).lean();
        if (activeFilter) {
          console.log(' > activeFilter ', activeFilter)
          query = this.applyFiltersToQuery(query, [activeFilter]);
          console.log(' > activeFilter query', query)

        }
      }
      if (search) {
        const schemaFields = Object.keys(Model.schema.paths);
        const searchableFields = schemaFields.filter(field =>
          Model.schema.paths[field].instance === 'String' &&
          !field.startsWith('_') &&
          field !== '__v'
        );

        if (searchableFields.length > 0) {
          query.$or = searchableFields.map(field => ({
            [field]: { $regex: search, $options: 'i' }
          }));
        }
      }
      if (facetQuery) {
        try {
          const parsedFacets = typeof facetQuery === 'string' ? JSON.parse(facetQuery) : facetQuery;
          query = this.buildFacetedQuery(query, parsedFacets);
        } catch (error) {
          console.error('Error parsing facets:', error);
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      console.log('getCollectionData query ', JSON.stringify(query, null, 2))
      const [data, total] = await Promise.all([
        Model.find(query, { _id: 0, __v: 0 })
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Model.countDocuments(query)
      ]);

      const sampleDoc = await Model.findOne(query, { _id: 0 }).lean();
      let fields = [];
      if (sampleDoc) {
        fields = extractAllFieldsFromDocument(sampleDoc);
        fields = fields.filter(field =>
          !field.startsWith('_') &&
          field !== '__v' &&
          field !== 'userId'
        );
      }
      const flattenedData = data.map(doc => flattenDocumentForResponse(doc));

      res.json({
        success: true,
        data,
        flattenedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        fields,
        search,
        sortBy,
        sortOrder
      });

    } catch (error) {
      console.error('Collection data error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching collection data'
      });
    }
  }

  async getCollectionFields(req, res) {
    try {
      const modelMap = {
        'organizations': Organization,
        'repositories': Repository,
        'commits': Commit,
        'pulls': PullRequest,
        'issues': Issue,
        'users': User
      };
      const { collectionName } = req.params;
      const { sample = 10 } = req.query;

      const Model = modelMap[collectionName];

      if (!Model) {
        return res.status(404).json({
          success: false,
          error: `Collection '${collectionName}' not found`
        });
      }

      const sampleDocs = await Model
        .find({}, { _id: 0, __v: 0 })
        .limit(parseInt(sample))
        .lean();

      if (sampleDocs.length === 0) {
        return res.json({
          success: true,
          collection: collectionName,
          fields: [],
          message: 'Collection is empty'
        });
      }

      const fields = extractAllFields(sampleDocs);

      res.json({
        success: true,
        collection: collectionName,
        fields,
        sampleSize: sampleDocs.length,
        totalFields: fields.length
      });

    } catch (error) {
      console.error('Get collection fields error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get collection fields',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  getColumnWidth(type, fieldName) {
    const fieldWidthMap = {
      'id': 100,
      'login': 120,
      'name': 200,
      'full_name': 250,
      'email': 200,
      'url': 300,
      'html_url': 300,
      'avatar_url': 300,
      'description': 300,
      'message': 400,
      'title': 300,
      'body': 400,
      'sha': 120,
      'state': 100,
      'number': 80
    };

    if (fieldWidthMap[fieldName]) {
      return fieldWidthMap[fieldName];
    }

    switch (type) {
      case 'date':
        return 180;
      case 'number':
        return 120;
      case 'boolean':
        return 100;
      case 'array':
        return 200;
      case 'object':
        return 250;
      default:
        return 200;
    }
  }

  async facetedSearch(req, res, next) {
    try {
      const { collection } = req.params;
      const { facets, page = 1, limit = 50 } = req.body;

      if (!facets || typeof facets !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Facets object is required'
        });
      }

      const offset = (page - 1) * limit;
      const query = this.buildFacetedQuery({}, facets);
      const modelMap = {
        'organizations': Organization,
        'repositories': Repository,
        'commits': Commit,
        'pulls': PullRequest,
        'issues': Issue,
        'users': User
      };
      const Model = modelMap[collection];
      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'Invalid collection name'
        });
      }
      const [data, total] = await Promise.all([
        Model.find(query, {_id:0, __v:0})
          .skip(offset)
          .limit(parseInt(limit))
          .toArray(),
        coll.countDocuments(query)
      ]);

      const facetCounts = {};
      const facetFields = Object.keys(facets);

      await Promise.all(
        facetFields.map(async (field) => {
          const pipeline = [
            { $match: query },
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
          ];

          const counts = await Model.aggregate(pipeline);
          facetCounts[field] = counts.map(item => ({
            value: item._id,
            count: item.count
          }));
        })
      );

      res.json({
        success: true,
        data,
        facetCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error in faceted search:', error);
      next(error);
    }
  };


}

export default new DataController();