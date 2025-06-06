import axios from 'axios';

export const githubAPI = async (url, accessToken, params = {}) => {
  try {
    const response = await axios.get(`https://api.github.com${url}`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-OAuth-Integration'
      },
      params: {
        per_page: 100,
        ...params
      },
      timeout: 30000
    });

    const remaining = response.headers['x-ratelimit-remaining'];
    const resetTime = response.headers['x-ratelimit-reset'];

    if (remaining && parseInt(remaining) < 100) {
      console.warn(`GitHub API rate limit warning: ${remaining} requests remaining (resets at ${new Date(parseInt(resetTime) * 1000)})`);
    }

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 403 && message.includes('rate limit')) {
      console.error('GitHub API rate limit exceeded');
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }

    console.error(`GitHub API error for ${url}:`, message);
    throw error;
  }
}

export const fetchAllPages = async (url, accessToken, params = {}, maxPages = null) => {
  let allData = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && (maxPages === null || page <= maxPages)) {
    try {
      const data = await githubAPI(url, accessToken, { ...params, page });

      if (Array.isArray(data) && data.length > 0) {
        allData = allData.concat(data);
        page++;
        hasNextPage = data.length === 100;
      } else {
        hasNextPage = false;
      }

      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`Error fetching page ${page} for ${url}:`, error.message);
      hasNextPage = false;
    }
  }

  return allData;
}

export const validateToken = async (accessToken) => {
  const result = await githubAPI('/user', accessToken);
  return result.success;
};

export const getUserOrganizations = async (accessToken) => {
  return await githubAPI('/user/orgs', accessToken);
};

export const getOrgRepositories = async (orgLogin, accessToken) => {
  return await fetchAllPages(`/orgs/${orgLogin}/repos`, accessToken);
};

export const getRepositoryCommits = async (repoFullName, accessToken) => {
  return await fetchAllPages(`/repos/${repoFullName}/commits`, accessToken);
};

export const getRepositoryPulls = async (repoFullName, accessToken) => {
  return await fetchAllPages(`/repos/${repoFullName}/pulls`, accessToken, { state: 'all' });
};

export const getRepositoryIssues = async (repoFullName, accessToken) => {
  return await fetchAllPages(`/repos/${repoFullName}/issues`, accessToken, { state: 'all' });
};

export const getOrganizationMembers = async (orgLogin, accessToken) => {
  return await fetchAllPages(`/orgs/${orgLogin}/members`, accessToken);
};

export const getUserDetails = async (username, accessToken) => {
  const result = await githubAPI(`/users/${username}`, accessToken);
  return result.success ? result.data : null;
};

export const checkRateLimit = async (accessToken) => {
  const result = await githubAPI('/rate_limit', accessToken);
  return result.success ? result.data : null;
};

// Query Helpers

export const getTicketSearchQuery = (ticketId, collectionName) => {
  const queries = {
    issues: {
      $or: [
        { id: parseInt(ticketId) || ticketId },
        { number: parseInt(ticketId) || 0 },
        { node_id: ticketId },
        { title: { $regex: ticketId, $options: 'i' } },
        { body: { $regex: ticketId, $options: 'i' } }
      ]
    },
    pulls: {
      $or: [
        { id: parseInt(ticketId) || ticketId },
        { number: parseInt(ticketId) || 0 },
        { node_id: ticketId },
        { title: { $regex: ticketId, $options: 'i' } },
        { body: { $regex: ticketId, $options: 'i' } }
      ]
    },
    commits: {
      $or: [
        { sha: ticketId },
        { node_id: ticketId },
        { 'commit.message': { $regex: ticketId, $options: 'i' } },
        { 'commit.sha': ticketId }
      ]
    }
  };
  
  return queries[collectionName] || {};
};

export const extractUserData = (item, collectionName) => {
  let user = null;
  let date = null;
  let summary = '';
  let description = '';
  
  switch (collectionName) {
    case 'issues':
      user = item.assignee || item.user;
      date = item.closed_at || item.updated_at || item.created_at;
      summary = item.title || 'No title';
      description = item.body || 'No description';
      break;
      
    case 'pulls':
      user = item.merged_by || item.assignee || item.user;
      date = item.merged_at || item.closed_at || item.updated_at || item.created_at;
      summary = item.title || 'No title';
      description = item.body || 'No description';
      break;
      
    case 'commits':
      user = item.author || item.committer || item.commit?.author || item.commit?.committer;
      date = item.commit?.author?.date || item.commit?.committer?.date || item.authored_at;
      summary = item.commit?.message || item.message || 'No message';
      description = summary;
      break;
      
    default:
      user = item.user || item.author || item.owner;
      date = item.updated_at || item.created_at;
      summary = item.title || item.name || 'No title';
      description = item.description || item.body || 'No description';
  }
  
  return {
    id: item.id || item.sha || item.node_id,
    user: user?.login || user?.name || 'Unknown',
    userName: user?.name || user?.login || 'Unknown',
    userId: user?.id || 'Unknown',
    userEmail: user?.email || 'Unknown',
    userAvatarUrl: user?.avatar_url || '',
    date: date,
    summary: summary,
    description: description,
    collection: collectionName,
    ticketId: item.number || item.id || item.sha
  };
};

export const getSearchableCollections = () => [
  'commits', 'pulls', 'issues', 'repos', 'users', 'organizations'
];