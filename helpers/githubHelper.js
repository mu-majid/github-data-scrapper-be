const axios = require('axios');

/**
 * Make authenticated request to GitHub API
 */
const githubAPI = async (url, accessToken, params = {}) => {
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
      }
    });

    return {
      success: true,
      data: response.data,
      rateLimit: {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset']
      }
    };
  } catch (error) {
    console.error(`GitHub API error for ${url}:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
};

/**
 * Fetch all pages for paginated GitHub API endpoints
 */
const fetchAllPages = async (url, accessToken, params = {}) => {
  let allData = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    try {
      const result = await githubAPI(url, accessToken, { ...params, page });
      
      if (!result.success) {
        console.error(`Error fetching page ${page} for ${url}:`, result.error);
        break;
      }

      const data = result.data;
      if (Array.isArray(data) && data.length > 0) {
        allData = allData.concat(data);
        page++;
        hasNextPage = data.length === 100; // GitHub returns max 100 per page
        
        // Log rate limit info
        if (result.rateLimit && result.rateLimit.remaining < 100) {
          console.warn(`GitHub API rate limit warning: ${result.rateLimit.remaining} requests remaining`);
        }
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error(`Error fetching page ${page} for ${url}:`, error.message);
      hasNextPage = false;
    }
  }

  return allData;
};

/**
 * Validate GitHub access token
 */
const validateToken = async (accessToken) => {
  const result = await githubAPI('/user', accessToken);
  return result.success;
};

/**
 * Get user's GitHub organizations
 */
const getUserOrganizations = async (accessToken) => {
  const result = await githubAPI('/user/orgs', accessToken);
  return result.success ? result.data : [];
};

/**
 * Get organization repositories
 */
const getOrgRepositories = async (orgLogin, accessToken) => {
  return await fetchAllPages(`/orgs/${orgLogin}/repos`, accessToken);
};

/**
 * Get repository commits
 */
const getRepositoryCommits = async (repoFullName, accessToken) => {
  return await fetchAllPages(`/repos/${repoFullName}/commits`, accessToken);
};

/**
 * Get repository pull requests
 */
const getRepositoryPulls = async (repoFullName, accessToken) => {
  return await fetchAllPages(`/repos/${repoFullName}/pulls`, accessToken, { state: 'all' });
};

/**
 * Get repository issues
 */
const getRepositoryIssues = async (repoFullName, accessToken) => {
  return await fetchAllPages(`/repos/${repoFullName}/issues`, accessToken, { state: 'all' });
};

/**
 * Get organization members
 */
const getOrganizationMembers = async (orgLogin, accessToken) => {
  return await fetchAllPages(`/orgs/${orgLogin}/members`, accessToken);
};

/**
 * Get user details
 */
const getUserDetails = async (username, accessToken) => {
  const result = await githubAPI(`/users/${username}`, accessToken);
  return result.success ? result.data : null;
};

/**
 * Rate limit helper
 */
const checkRateLimit = async (accessToken) => {
  const result = await githubAPI('/rate_limit', accessToken);
  return result.success ? result.data : null;
};

module.exports = {
  githubAPI,
  fetchAllPages,
  validateToken,
  getUserOrganizations,
  getOrgRepositories,
  getRepositoryCommits,
  getRepositoryPulls,
  getRepositoryIssues,
  getOrganizationMembers,
  getUserDetails,
  checkRateLimit
};