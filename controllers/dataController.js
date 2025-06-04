import { Organization, Repository, Commit, PullRequest, Issue, User } from '../models/GithubData.js';
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

  async getCollectionData(req, res) {
    try {
      const { collectionName } = req.params;
      const { page = 1, limit = 50, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const modelMap = {
        'organizations': Organization,
        'repositories': Repository,
        'commits': Commit,
        'pulls': PullRequest,
        'issues': Issue,
        'users': User
      };

      const Model = modelMap[collectionName];
      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'Invalid collection name'
        });
      }
      const query = { userId: req.githubIntegration.userId };

      if (search) {
        // Get all fields from the model schema
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
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      const [data, total] = await Promise.all([
        Model.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Model.countDocuments(query)
      ]);
      const sampleDoc = await Model.findOne(query).lean();
      const fields = sampleDoc ? Object.keys(sampleDoc).filter(key => 
        !key.startsWith('_') && key !== '__v' && key !== 'userId'
      ) : [];

      res.json({
        success: true,
        data,
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
      const { collectionName } = req.params;

      const modelMap = {
        'organizations': Organization,
        'repositories': Repository,
        'commits': Commit,
        'pulls': PullRequest,
        'issues': Issue,
        'users': User
      };

      const Model = modelMap[collectionName];
      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'Invalid collection name'
        });
      }

      // Get a sample document to determine field types
      const sampleDoc = await Model.findOne({ userId: req.githubIntegration.userId }).lean();
      
      if (!sampleDoc) {
        return res.json({
          success: true,
          fields: [],
          message: 'No data available for this collection'
        });
      }

      // Create field definitions for AG Grid
      const fields = Object.keys(sampleDoc)
        .filter(key => !key.startsWith('_') && key !== '__v' && key !== 'userId')
        .map(key => {
          const value = sampleDoc[key];
          let type = 'string';
          let cellRenderer = null;
          
          if (typeof value === 'number') {
            type = 'number';
          } else if (value instanceof Date) {
            type = 'date';
            cellRenderer = 'dateRenderer';
          } else if (typeof value === 'boolean') {
            type = 'boolean';
            cellRenderer = 'booleanRenderer';
          } else if (Array.isArray(value)) {
            type = 'array';
            cellRenderer = 'arrayRenderer';
          } else if (typeof value === 'object' && value !== null) {
            type = 'object';
            cellRenderer = 'objectRenderer';
          }

          return {
            field: key,
            headerName: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            type,
            sortable: true,
            filter: true,
            resizable: true,
            width: this.getColumnWidth(type, key),
            cellRenderer
          };
        });

      res.json({
        success: true,
        fields
      });

    } catch (error) {
      console.error('Fields error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching field definitions'
      });
    }
  }

  getColumnWidth(type, fieldName) {
    // Specific field width mappings
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

    // Check for specific field name first
    if (fieldWidthMap[fieldName]) {
      return fieldWidthMap[fieldName];
    }

    // Default widths by type
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
}

export default new DataController();