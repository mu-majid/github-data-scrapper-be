import { Organization, Repository, Commit, PullRequest, Issue, User } from '../models/GithubData.js';
import { extractAllFields, flattenDocuments, extractAllFieldsFromDocument, flattenDocumentForResponse } from '../helpers/dataViewHelper.js';

const modelMap = {
  'organizations': Organization,
  'repositories': Repository,
  'commits': Commit,
  'pulls': PullRequest,
  'issues': Issue,
  'users': User
};
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

      const Model = modelMap[collectionName];
      if (!Model) {
        return res.status(400).json({
          success: false,
          message: 'Invalid collection name'
        });
      }

      const query = { userId: req.githubIntegration.userId };

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
  
      // Enhanced field extraction with nested object support
      const sampleDoc = await Model.findOne(query).lean();
      let fields = [];
      
      if (sampleDoc) {
        // Extract all fields including nested ones
        fields = extractAllFieldsFromDocument(sampleDoc);
        
        // Filter out MongoDB internal fields and userId
        fields = fields.filter(field => 
          !field.startsWith('_') && 
          field !== '__v' && 
          field !== 'userId'
        );
      }
      const flattenedData = data.map(doc => flattenDocumentForResponse(doc));
  
      res.json({
        success: true,
        data: flattenedData,
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
      const { name: collectionName } = req.params;
      const { sample = 10 } = req.query;
      
      const Model = modelMap[collectionName];
      if (!Model) {
        return res.status(404).json({
          success: false,
          error: `Collection '${collectionName}' not found`
        });
      }
      
      const sampleDocs = await Model
        .find({})
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
}

export default new DataController();