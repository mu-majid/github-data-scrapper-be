import { Commit, Issue, PullRequest, Repository } from '../models/GithubData.js';

class DataVisualizationController {
  /**
   * Get repository data with related commits, pull requests, and issues
   * Uses repositoryId as the common identifier for joining collections
   */
  async getRepositoryData(req, res) {
    try {
      const {
        repositoryId,
        page = 1,
        limit = 10,
        sort_by = 'createdAt',
        sort_order = 'desc',
        date_from,
        date_to,
        author,
        status
      } = req.query;

      // Validate required parameter
      if (!repositoryId) {
        return res.status(400).json({
          success: false,
          message: 'repositoryId parameter is required'
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      const sortDirection = sort_order === 'desc' ? -1 : 1;
      const dateFilter = {};
      if (date_from || date_to) {
        dateFilter.createdAt = {};
        if (date_from) dateFilter.createdAt.$gte = new Date(date_from);
        if (date_to) dateFilter.createdAt.$lte = new Date(date_to);
      }

      const authorFilter = author ? { 'author.login': { $regex: author, $options: 'i' } } : {};
      const statusFilter = status ? { state: status } : {};

      const pipeline = [
        {
          $match: {
            id: parseInt(repositoryId) || repositoryId
          }
        },
        {
          $lookup: {
            from: 'commits',
            let: { repoId: '$id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$repositoryId', '$$repoId'] },
                  ...dateFilter,
                  ...authorFilter
                }
              },
              {
                $project: {
                  hash: '$sha',
                  message: '$commit.message',
                  author: '$author',
                  createdAt: 1,
                  repositoryId: 1,
                  _id: 1
                }
              },
              { $sort: { [sort_by]: sortDirection } },
              { $skip: skip },
              { $limit: limitNum }
            ],
            as: 'commits'
          }
        },
        {
          $lookup: {
            from: 'pulls',
            let: { repoId: '$id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$repositoryId', '$$repoId'] },
                  ...dateFilter,
                  ...authorFilter,
                  ...statusFilter
                }
              },
              {
                $project: {
                  number: 1,
                  title: 1,
                  status: '$state',
                  author: '$user',
                  createdAt: 1,
                  repositoryId: 1,
                  _id: 1
                }
              },
              { $sort: { [sort_by]: sortDirection } },
              { $skip: skip },
              { $limit: limitNum }
            ],
            as: 'pullRequests'
          }
        },
        {
          $lookup: {
            from: 'issues',
            let: { repoId: '$id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$repositoryId', '$$repoId'] },
                  ...dateFilter,
                  ...authorFilter,
                  ...statusFilter
                }
              },
              {
                $project: {
                  number: 1,
                  title: 1, // Include issue title as requested
                  state: 1,
                  author: '$user',
                  createdAt: 1,
                  repositoryId: 1,
                  _id: 1
                }
              },
              { $sort: { [sort_by]: sortDirection } },
              { $skip: skip },
              { $limit: limitNum }
            ],
            as: 'issues'
          }
        },
        {
          $project: {
            repository: {
              id: '$_id',
              repositoryId: '$id',
              name: '$name',
              fullName: '$fullName',
              description: '$description',
              language: '$language',
              stargazersCount: '$stargazersCount',
              forksCount: '$forksCount',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt'
            },
            commits: 1,
            pullRequests: 1,
            issues: 1,
            summary: {
              totalCommits: { $size: '$commits' },
              totalPullRequests: { $size: '$pullRequests' },
              totalIssues: { $size: '$issues' },
              openPullRequests: {
                $size: {
                  $filter: {
                    input: '$pullRequests',
                    cond: { $eq: ['$$this.status', 'open'] }
                  }
                }
              },
              openIssues: {
                $size: {
                  $filter: {
                    input: '$issues',
                    cond: { $eq: ['$$this.state', 'open'] }
                  }
                }
              }
            }
          }
        }
      ];

      console.log(JSON.stringify(pipeline, null, 2))

      const result = await Repository.aggregate(pipeline);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Repository not found'
        });
      }
      const totalCounts = await this.getTotalCounts(repositoryId, {
        dateFilter,
        authorFilter,
        statusFilter
      });

      res.json({
        success: true,
        data: result[0],
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalCommits: totalCounts.commits,
          totalPullRequests: totalCounts.pullRequests,
          totalIssues: totalCounts.issues,
          hasNextPage: {
            commits: totalCounts.commits > (pageNum * limitNum),
            pullRequests: totalCounts.pullRequests > (pageNum * limitNum),
            issues: totalCounts.issues > (pageNum * limitNum)
          }
        }
      });

    } catch (error) {
      console.error('Error in getRepositoryData:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Helper method to get total counts for pagination
   */
  async getTotalCounts(repositoryId, filters) {
    const { dateFilter, authorFilter, statusFilter } = filters;

    const baseFilter = { repositoryId: repositoryId };

    const [commits, pullRequests, issues] = await Promise.all([
      Commit.countDocuments({
        ...baseFilter,
        ...dateFilter,
        ...authorFilter
      }),
      PullRequest.countDocuments({
        ...baseFilter,
        ...dateFilter,
        ...authorFilter,
        ...statusFilter
      }),
      Issue.countDocuments({
        ...baseFilter,
        ...dateFilter,
        ...authorFilter,
        ...statusFilter
      })
    ]);

    return { commits, pullRequests, issues };
  }
}

export default new DataVisualizationController();