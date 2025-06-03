const { Organization, Repository, Commit, PullRequest, Issue, User } = require('../models/GithubData');

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

      // Map collection names to models
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

      // Build query
      const query = { userId: req.githubIntegration.userId };

      // Add search functionality
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

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const [data, total] = await Promise.all([
        Model.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Model.countDocuments(query)
      ]);

      // Get field definitions for the grid
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

  async exportCollectionData(req, res) {
    try {
      const { collectionName } = req.params;
      const { format = 'json', limit = 10000 } = req.query;

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

      // Get data for the user (with limit to prevent memory issues)
      const data = await Model.find({ userId: req.githubIntegration.userId })
        .limit(parseInt(limit))
        .lean();

      if (format === 'csv') {
        // Convert to CSV format
        if (data.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No data to export'
          });
        }

        const headers = Object.keys(data[0]).filter(key => 
          !key.startsWith('_') && key !== '__v' && key !== 'userId'
        );
        
        let csv = headers.join(',') + '\n';
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
            return `"${value.toString().replace(/"/g, '""')}"`;
          });
          csv += values.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${collectionName}_export.csv`);
        res.send(csv);
      } else {
        // Return JSON format
        res.json({
          success: true,
          collection: collectionName,
          count: data.length,
          exportedAt: new Date().toISOString(),
          data
        });
      }

    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting data'
      });
    }
  }

  async getCollectionStats(req, res) {
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

      const userId = req.githubIntegration.userId;

      // Get basic statistics
      const [total, recent] = await Promise.all([
        Model.countDocuments({ userId }),
        Model.countDocuments({ 
          userId, 
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        })
      ]);

      // Get date range if documents exist
      let dateRange = null;
      if (total > 0) {
        const [oldest, newest] = await Promise.all([
          Model.findOne({ userId }).sort({ createdAt: 1 }).select('createdAt').lean(),
          Model.findOne({ userId }).sort({ createdAt: -1 }).select('createdAt').lean()
        ]);
        
        dateRange = {
          oldest: oldest?.createdAt,
          newest: newest?.createdAt
        };
      }

      res.json({
        success: true,
        collection: collectionName,
        stats: {
          total,
          recentlyAdded: recent,
          dateRange
        }
      });

    } catch (error) {
      console.error('Collection stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching collection statistics'
      });
    }
  }

  async searchAllCollections(req, res) {
    try {
      const { query: searchQuery, limit = 10 } = req.query;

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const models = [
        { name: 'organizations', model: Organization },
        { name: 'repositories', model: Repository },
        { name: 'commits', model: Commit },
        { name: 'pulls', model: PullRequest },
        { name: 'issues', model: Issue },
        { name: 'users', model: User }
      ];

      const searchResults = await Promise.all(
        models.map(async ({ name, model }) => {
          try {
            // Get searchable string fields
            const schemaFields = Object.keys(model.schema.paths);
            const searchableFields = schemaFields.filter(field => 
              model.schema.paths[field].instance === 'String' && 
              !field.startsWith('_') && 
              field !== '__v'
            );

            if (searchableFields.length === 0) {
              return { collection: name, results: [], count: 0 };
            }

            const searchConditions = {
              userId: req.githubIntegration.userId,
              $or: searchableFields.map(field => ({
                [field]: { $regex: searchQuery, $options: 'i' }
              }))
            };

            const [results, count] = await Promise.all([
              model.find(searchConditions).limit(parseInt(limit)).lean(),
              model.countDocuments(searchConditions)
            ]);

            return {
              collection: name,
              results,
              count
            };
          } catch (error) {
            console.error(`Search error in ${name}:`, error);
            return { collection: name, results: [], count: 0, error: error.message };
          }
        })
      );

      const totalResults = searchResults.reduce((sum, result) => sum + result.count, 0);

      res.json({
        success: true,
        query: searchQuery,
        totalResults,
        collections: searchResults
      });

    } catch (error) {
      console.error('Global search error:', error);
      res.status(500).json({
        success: false,
        message: 'Error performing search'
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

  async deleteRecord(req, res) {
    try {
      const { collectionName, recordId } = req.params;

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

      const deletedRecord = await Model.findOneAndDelete({
        _id: recordId,
        userId: req.githubIntegration.userId
      });

      if (!deletedRecord) {
        return res.status(404).json({
          success: false,
          message: 'Record not found'
        });
      }

      res.json({
        success: true,
        message: 'Record deleted successfully',
        deletedRecord: {
          id: deletedRecord._id,
          collection: collectionName
        }
      });

    } catch (error) {
      console.error('Delete record error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting record'
      });
    }
  }

  async clearCollection(req, res) {
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

      const result = await Model.deleteMany({ userId: req.githubIntegration.userId });

      res.json({
        success: true,
        message: `Collection ${collectionName} cleared successfully`,
        deletedCount: result.deletedCount
      });

    } catch (error) {
      console.error('Clear collection error:', error);
      res.status(500).json({
        success: false,
        message: 'Error clearing collection'
      });
    }
  }
}

module.exports = new DataController();