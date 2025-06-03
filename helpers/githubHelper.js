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
      const data = await this.githubAPI(url, accessToken, { ...params, page });

      if (Array.isArray(data) && data.length > 0) {
        allData = allData.concat(data);
        console.log(` Page ${page}: ${data.length} items (total: ${allData.length})`);
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
  const result = await githubAPI('/user/orgs', accessToken);
  return result.success ? result.data : [];
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