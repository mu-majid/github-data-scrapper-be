const createFacetIndexes = async (db) => {
  try {
    const facetConfigs = {
      'repositories': ['owner.login', 'language', 'private', 'fork', 'created_at'],
      'organizations': ['blog', 'description', 'name', 'email'],
      'commits': ['author.login', 'committer.login', 'commit.author.date'],
      'pulls': ['user.login', 'state', 'merged', 'created_at', 'closed_at'],
      'issues': ['user.login', 'state', 'labels', 'created_at', 'closed_at'],
      'users': ['type', 'site_admin', 'created_at']
    };

    for (const [collection, fields] of Object.entries(facetConfigs)) {
      const coll = db.collection(collection);
      
      // Create single field indexes for facet performance
      for (const field of fields) {
        await coll.createIndex({ [field]: 1 });
        console.log(`Created index on ${collection}.${field}`);
      }
      
      // Create compound index for common query patterns
      if (fields.length > 1) {
        const compoundIndex = {};
        fields.slice(0, 3).forEach(field => {
          compoundIndex[field] = 1;
        });
        await coll.createIndex(compoundIndex);
        console.log(`Created compound index on ${collection}`);
      }
    }
    
    console.log('All facet indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

module.exports = { createFacetIndexes };