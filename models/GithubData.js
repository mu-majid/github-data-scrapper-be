import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  id: { type: Number, required: true },
  login: { type: String, required: true },
  url: { type: String },
  repos_url: { type: String },
  events_url: { type: String },
  hooks_url: { type: String },
  issues_url: { type: String },
  members_url: { type: String },
  public_members_url: { type: String },
  avatar_url: { type: String },
  description: { type: String },
  name: { type: String },
  company: { type: String },
  blog: { type: String },
  location: { type: String },
  email: { type: String },
  twitter_username: { type: String },
  is_verified: { type: Boolean },
  has_organization_projects: { type: Boolean },
  has_repository_projects: { type: Boolean },
  public_repos: { type: Number },
  public_gists: { type: Number },
  followers: { type: Number },
  following: { type: Number },
  html_url: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  type: { type: String },
  total_private_repos: { type: Number },
  owned_private_repos: { type: Number },
  private_gists: { type: Number },
  disk_usage: { type: Number },
  collaborators: { type: Number },
  billing_email: { type: String },
  plan: {
    name: { type: String },
    space: { type: Number },
    private_repos: { type: Number },
    filled_seats: { type: Number },
    seats: { type: Number }
  },
  default_repository_permission: { type: String },
  members_can_create_repositories: { type: Boolean },
  two_factor_requirement_enabled: { type: Boolean },
  members_allowed_repository_creation_type: { type: String },
  members_can_create_public_repositories: { type: Boolean },
  members_can_create_private_repositories: { type: Boolean },
  members_can_create_internal_repositories: { type: Boolean },
  members_can_create_pages: { type: Boolean },
  members_can_fork_private_repositories: { type: Boolean }
}, {
  timestamps: true,
  collection: 'organizations'
});

const repositorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  organizationId: { type: Number, required: true },
  id: { type: Number, required: true },
  name: { type: String, required: true },
  full_name: { type: String, required: true },
  owner: {
    login: { type: String },
    id: { type: Number },
    avatar_url: { type: String },
    url: { type: String },
    html_url: { type: String },
    type: { type: String }
  },
  private: { type: Boolean },
  html_url: { type: String },
  description: { type: String },
  fork: { type: Boolean },
  url: { type: String },
  archive_url: { type: String },
  assignees_url: { type: String },
  blobs_url: { type: String },
  branches_url: { type: String },
  collaborators_url: { type: String },
  comments_url: { type: String },
  commits_url: { type: String },
  compare_url: { type: String },
  contents_url: { type: String },
  contributors_url: { type: String },
  deployments_url: { type: String },
  downloads_url: { type: String },
  events_url: { type: String },
  forks_url: { type: String },
  git_commits_url: { type: String },
  git_refs_url: { type: String },
  git_tags_url: { type: String },
  git_url: { type: String },
  issue_comment_url: { type: String },
  issue_events_url: { type: String },
  issues_url: { type: String },
  keys_url: { type: String },
  labels_url: { type: String },
  languages_url: { type: String },
  merges_url: { type: String },
  milestones_url: { type: String },
  notifications_url: { type: String },
  pulls_url: { type: String },
  releases_url: { type: String },
  ssh_url: { type: String },
  stargazers_url: { type: String },
  statuses_url: { type: String },
  subscribers_url: { type: String },
  subscription_url: { type: String },
  tags_url: { type: String },
  teams_url: { type: String },
  trees_url: { type: String },
  clone_url: { type: String },
  mirror_url: { type: String },
  hooks_url: { type: String },
  svn_url: { type: String },
  homepage: { type: String },
  language: { type: String },
  forks_count: { type: Number },
  stargazers_count: { type: Number },
  watchers_count: { type: Number },
  size: { type: Number },
  default_branch: { type: String },
  open_issues_count: { type: Number },
  is_template: { type: Boolean },
  topics: [{ type: String }],
  has_issues: { type: Boolean },
  has_projects: { type: Boolean },
  has_wiki: { type: Boolean },
  has_pages: { type: Boolean },
  has_downloads: { type: Boolean },
  archived: { type: Boolean },
  disabled: { type: Boolean },
  visibility: { type: String },
  pushed_at: { type: Date },
  created_at: { type: Date },
  updated_at: { type: Date },
  permissions: {
    admin: { type: Boolean },
    maintain: { type: Boolean },
    push: { type: Boolean },
    triage: { type: Boolean },
    pull: { type: Boolean }
  },
  allow_rebase_merge: { type: Boolean },
  template_repository: mongoose.Schema.Types.Mixed,
  temp_clone_token: { type: String },
  allow_squash_merge: { type: Boolean },
  allow_auto_merge: { type: Boolean },
  delete_branch_on_merge: { type: Boolean },
  allow_merge_commit: { type: Boolean },
  subscribers_count: { type: Number },
  network_count: { type: Number }
}, {
  timestamps: true,
  collection: 'repositories'
});

const commitSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  organizationId: { type: Number, required: true },
  repositoryId: { type: Number, required: true, ref: 'Repository' },
  sha: { type: String, required: true },
  commit: {
    author: {
      name: { type: String },
      email: { type: String },
      date: { type: Date }
    },
    committer: {
      name: { type: String },
      email: { type: String },
      date: { type: Date }
    },
    message: { type: String },
    tree: {
      sha: { type: String },
      url: { type: String }
    },
    url: { type: String },
    comment_count: { type: Number },
    verification: {
      verified: { type: Boolean },
      reason: { type: String },
      signature: { type: String },
      payload: { type: String }
    }
  },
  url: { type: String },
  html_url: { type: String },
  comments_url: { type: String },
  author: {
    login: { type: String },
    id: { type: Number },
    avatar_url: { type: String },
    url: { type: String },
    html_url: { type: String },
    type: { type: String }
  },
  committer: {
    login: { type: String },
    id: { type: Number },
    avatar_url: { type: String },
    url: { type: String },
    html_url: { type: String },
    type: { type: String }
  },
  parents: [{
    sha: { type: String },
    url: { type: String },
    html_url: { type: String }
  }]
}, {
  timestamps: true,
  collection: 'commits'
});

const pullRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  organizationId: { type: Number, required: true },
  repositoryId: { type: Number, required: true, ref: 'Repository' },
  id: { type: Number, required: true },
  number: { type: Number, required: true },
  state: { type: String },
  locked: { type: Boolean },
  title: { type: String },
  user: {
    login: { type: String },
    id: { type: Number },
    avatar_url: { type: String },
    url: { type: String },
    html_url: { type: String },
    type: { type: String }
  },
  body: { type: String },
  labels: [{
    id: { type: Number },
    url: { type: String },
    name: { type: String },
    color: { type: String },
    default: { type: Boolean },
    description: { type: String }
  }],
  milestone: mongoose.Schema.Types.Mixed,
  active_lock_reason: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  closed_at: { type: Date },
  merged_at: { type: Date },
  merge_commit_sha: { type: String },
  assignee: mongoose.Schema.Types.Mixed,
  assignees: [mongoose.Schema.Types.Mixed],
  requested_reviewers: [mongoose.Schema.Types.Mixed],
  requested_teams: [mongoose.Schema.Types.Mixed],
  head: {
    label: { type: String },
    ref: { type: String },
    sha: { type: String },
    user: mongoose.Schema.Types.Mixed,
    repo: mongoose.Schema.Types.Mixed
  },
  base: {
    label: { type: String },
    ref: { type: String },
    sha: { type: String },
    user: mongoose.Schema.Types.Mixed,
    repo: mongoose.Schema.Types.Mixed
  },
  _links: mongoose.Schema.Types.Mixed,
  author_association: { type: String },
  auto_merge: mongoose.Schema.Types.Mixed,
  draft: { type: Boolean },
  merged: { type: Boolean },
  mergeable: { type: Boolean },
  rebaseable: { type: Boolean },
  mergeable_state: { type: String },
  merged_by: mongoose.Schema.Types.Mixed,
  comments: { type: Number },
  review_comments: { type: Number },
  maintainer_can_modify: { type: Boolean },
  commits: { type: Number },
  additions: { type: Number },
  deletions: { type: Number },
  changed_files: { type: Number }
}, {
  timestamps: true,
  collection: 'pulls'
});

const issueSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  organizationId: { type: Number, required: true, ref: 'Organization' },
  repositoryId: { type: Number, required: true, ref: 'Repository' },
  id: { type: Number, required: true },
  number: { type: Number, required: true },
  title: { type: String },
  user: {
    login: { type: String },
    id: { type: Number },
    avatar_url: { type: String },
    url: { type: String },
    html_url: { type: String },
    type: { type: String }
  },
  labels: [{
    id: { type: Number },
    url: { type: String },
    name: { type: String },
    color: { type: String },
    default: { type: Boolean },
    description: { type: String }
  }],
  state: { type: String },
  locked: { type: Boolean },
  assignee: mongoose.Schema.Types.Mixed,
  assignees: [mongoose.Schema.Types.Mixed],
  milestone: mongoose.Schema.Types.Mixed,
  comments: { type: Number },
  created_at: { type: Date },
  updated_at: { type: Date },
  closed_at: { type: Date },
  author_association: { type: String },
  active_lock_reason: { type: String },
  body: { type: String },
  reactions: {
    url: { type: String },
    total_count: { type: Number },
    '+1': { type: Number },
    '-1': { type: Number },
    laugh: { type: Number },
    hooray: { type: Number },
    confused: { type: Number },
    heart: { type: Number },
    rocket: { type: Number },
    eyes: { type: Number }
  },
  timeline_url: { type: String },
  performed_via_github_app: mongoose.Schema.Types.Mixed,
  state_reason: { type: String }
}, {
  timestamps: true,
  collection: 'issues'
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  organizationId: { type: Number, required: true },
  login: { type: String, required: true },
  id: { type: Number, required: true },
  avatar_url: { type: String },
  url: { type: String },
  html_url: { type: String },
  followers_url: { type: String },
  following_url: { type: String },
  gists_url: { type: String },
  starred_url: { type: String },
  subscriptions_url: { type: String },
  organizations_url: { type: String },
  repos_url: { type: String },
  events_url: { type: String },
  received_events_url: { type: String },
  type: { type: String },
  site_admin: { type: Boolean },
  name: { type: String },
  company: { type: String },
  blog: { type: String },
  location: { type: String },
  email: { type: String },
  hireable: { type: Boolean },
  bio: { type: String },
  twitter_username: { type: String },
  public_repos: { type: Number },
  public_gists: { type: Number },
  followers: { type: Number },
  following: { type: Number },
  created_at: { type: Date },
  updated_at: { type: Date }
}, {
  timestamps: true,
  collection: 'users'
});

export const Organization = mongoose.model('Organization', organizationSchema)
export const Repository = mongoose.model('Repository', repositorySchema)
export const Commit = mongoose.model('Commit', commitSchema)
export const PullRequest = mongoose.model('PullRequest', pullRequestSchema)
export const Issue = mongoose.model('Issue', issueSchema)
export const User = mongoose.model('User', userSchema)
