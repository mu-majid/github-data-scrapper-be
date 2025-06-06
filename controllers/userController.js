import { flattenDocuments } from '../helpers/dataViewHelper.js';
import { getTicketSearchQuery, extractUserData } from '../helpers/githubHelper.js';
import { Organization, Repository, Commit, PullRequest, Issue, User } from '../models/GithubData.js';

export const findUser = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!ticketId || ticketId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Ticket ID is required'
      });
    }

    const modelMap = {
      'organizations': Organization,
      'repositories': Repository,
      'commits': Commit,
      'pulls': PullRequest,
      'issues': Issue,
      'users': User
    };

    const searchCollections = ['issues', 'pulls', 'commits'];
    const userTicketData = [];
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const searchPromises = searchCollections.map(async (collectionName) => {
      try {

        const Model = modelMap[collectionName];
        const searchQuery = getTicketSearchQuery(ticketId, collectionName);
        const results = await Model.find(searchQuery).skip(skip).limit(parseInt(limit)).lean();
        console.log(' DEBUG ', Model, collectionName)
        console.log(' DEBUG ', searchQuery, collectionName)

        return results.map(item => extractUserData(item, collectionName));
      } catch (collectionError) {
        console.warn(`Error searching ${collectionName} for ticket ${ticketId}:`, collectionError.message);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);

    searchResults.forEach(collectionResults => {
      userTicketData.push(...collectionResults);
    });

    const uniqueResults = userTicketData.filter((item, index, self) =>
      index === self.findIndex(t => t.id === item.id && t.collection === item.collection)
    );

    uniqueResults.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });

    res.json({
      success: true,
      ticketId,
      userData: flattenDocuments(uniqueResults),
      totalResults: uniqueResults.length,
      searchedCollections: searchCollections
    });

  } catch (error) {
    console.error('Find user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find user data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getUserActivity = async (req, res) => {
  try {
    const modelMap = {
      'organizations': Organization,
      'repositories': Repository,
      'commits': Commit,
      'pulls': PullRequest,
      'issues': Issue,
      'users': User
    };
    const { userId } = req.params;
    const { startDate, endDate, collections = 'issues,pulls,commits', page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const searchCollections = collections.split(',');
    const userActivity = [];

    const searchPromises = searchCollections.map(async (collectionName) => {
      try {
        const collection = modelMap[collectionName];
        let query = {};

        // should be added to some helper function
        switch (collectionName) {
          case 'issues':
            query = {
              $or: [
                { 'user.id': parseInt(userId) },
                { 'assignee.id': parseInt(userId) },
                { 'user.login': userId },
                { 'assignee.login': userId }
              ]
            };
            break;
          case 'pulls':
            query = {
              $or: [
                { 'user.id': parseInt(userId) },
                { 'merged_by.id': parseInt(userId) },
                { 'user.login': userId },
                { 'merged_by.login': userId }
              ]
            };
            break;
          case 'commits':
            query = {
              $or: [
                { 'author.id': parseInt(userId) },
                { 'committer.id': parseInt(userId) },
                { 'author.login': userId },
                { 'committer.login': userId },
                { 'commit.author.name': userId },
                { 'commit.committer.name': userId }
              ]
            };
            break;
        }

        if (startDate && endDate) {
          const dateQuery = {
            $or: [
              { created_at: { $gte: new Date(startDate), $lte: new Date(endDate) } },
              { updated_at: { $gte: new Date(startDate), $lte: new Date(endDate) } }
            ]
          };
          query = { ...query, ...dateQuery };
        }

        const results = await collection.find(query).sort({ created_at: -1 }).toArray();

        return results.map(item => ({
          ...extractUserData(item, collectionName),
          activityType: collectionName
        }));
      } catch (error) {
        console.warn(`Error getting user activity from ${collectionName}:`, error.message);
        return [];
      }
    });

    const activityResults = await Promise.all(searchPromises);
    activityResults.forEach(results => userActivity.push(...results));
    userActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      userId,
      activity: flattenDocuments(userActivity),
      totalActivities: userActivity.length,
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user activity',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};