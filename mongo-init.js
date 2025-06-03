// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('integrations');
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'integrations'
    }
  ]
});

db.createCollection('github-integration');
db.createCollection('organizations');
db.createCollection('repositories');
db.createCollection('commits');
db.createCollection('pulls');
db.createCollection('issues');
db.createCollection('users');

db['github-integration'].createIndex({ 'githubId': 1 }, { unique: true });
db['github-integration'].createIndex({ 'userId': 1 }, { unique: true });
db['github-integration'].createIndex({ 'username': 1 });
db['github-integration'].createIndex({ 'isActive': 1 });
db['github-integration'].createIndex({ 'connectedAt': 1 });

db.organizations.createIndex({ 'userId': 1, 'id': 1 }, { unique: true });
db.organizations.createIndex({ 'userId': 1 });
db.organizations.createIndex({ 'login': 1 });

db.repositories.createIndex({ 'userId': 1, 'id': 1 }, { unique: true });
db.repositories.createIndex({ 'userId': 1 });
db.repositories.createIndex({ 'organizationId': 1 });
db.repositories.createIndex({ 'full_name': 1 });
db.repositories.createIndex({ 'name': 1 });

db.commits.createIndex({ 'userId': 1, 'sha': 1 }, { unique: true });
db.commits.createIndex({ 'userId': 1 });
db.commits.createIndex({ 'organizationId': 1 });
db.commits.createIndex({ 'repositoryId': 1 });
db.commits.createIndex({ 'commit.author.date': 1 });

db.pulls.createIndex({ 'userId': 1, 'id': 1 }, { unique: true });
db.pulls.createIndex({ 'userId': 1 });
db.pulls.createIndex({ 'organizationId': 1 });
db.pulls.createIndex({ 'repositoryId': 1 });
db.pulls.createIndex({ 'state': 1 });
db.pulls.createIndex({ 'created_at': 1 });

db.issues.createIndex({ 'userId': 1, 'id': 1 }, { unique: true });
db.issues.createIndex({ 'userId': 1 });
db.issues.createIndex({ 'organizationId': 1 });
db.issues.createIndex({ 'repositoryId': 1 });
db.issues.createIndex({ 'state': 1 });
db.issues.createIndex({ 'created_at': 1 });

db.users.createIndex({ 'userId': 1, 'id': 1 }, { unique: true });
db.users.createIndex({ 'userId': 1 });
db.users.createIndex({ 'organizationId': 1 });
db.users.createIndex({ 'login': 1 });

print('Database initialization completed successfully!');