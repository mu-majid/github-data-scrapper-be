const mongoose = require('mongoose');

const githubIntegrationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  githubId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String
  },
  avatarUrl: {
    type: String
  },
  profileUrl: {
    type: String
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  organizations: [{
    id: Number,
    login: String,
    url: String,
    description: String
  }]
}, {
  timestamps: true,
  collection: 'github-integration'
});

module.exports = mongoose.model('GithubIntegration', githubIntegrationSchema);