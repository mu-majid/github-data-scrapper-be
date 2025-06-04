import GithubIntegration from '../models/GithubIntegration.js';
import { Organization, Repository, Commit, PullRequest, Issue, User } from '../models/GithubData.js';
import { 
  getOrgRepositories, 
  getOrganizationMembers, 
  getRepositoryCommits, 
  getRepositoryIssues, 
  getRepositoryPulls, 
  getUserDetails, 
  getUserOrganizations,
  checkRateLimit,
  validateToken,
  // for testing jupyter
  githubAPI,
  fetchAllPages
} from '../helpers/githubHelper.js'

class GitHubController {

  async syncGithubData(req, res) {
    try {
      const { accessToken, userId } = req.githubIntegration;
      const syncStartTime = new Date();
      const organizations = await getUserOrganizations(accessToken);

      if (organizations.length > 0) {
        const orgOperations = organizations.map(org => ({
          updateOne: {
            filter: { userId, id: org.id },
            update: {
              $set: {
                ...org,
                userId,
                organizationId: org.id,
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        }));
        const orgResult = await Organization.bulkWrite(orgOperations, { ordered: false });
        console.log(` Organizations: ${orgResult.upsertedCount} created, ${orgResult.modifiedCount} updated`);
      }

      let totalRepos = 0;
      let totalCommits = 0;
      let totalPulls = 0;
      let totalIssues = 0;
      let totalUsers = 0;

      for (const org of organizations) {
        console.log(`\n Processing organization: ${org.login}`);

        try {
          const repos = await getOrgRepositories(org.login, accessToken);
          totalRepos += repos.length;
          if (repos.length > 0) {
            const repoOperations = repos.map(repo => ({
              updateOne: {
                filter: { userId, id: repo.id },
                update: {
                  $set: {
                    ...repo,
                    userId,
                    organizationId: org.id,
                    updatedAt: new Date()
                  }
                },
                upsert: true
              }
            }));

            const repoResult = await Repository.bulkWrite(repoOperations, { ordered: false });
            console.log(`Repositories: ${repoResult.upsertedCount} created, ${repoResult.modifiedCount} updated`);
          }

          for (const repo of repos) {
            console.log(`Processing repository: ${repo.name}`);

            const [commits, pulls, issues] = await Promise.allSettled([
              getRepositoryCommits(repo.full_name, accessToken),
              getRepositoryPulls(repo.full_name, accessToken, { state: 'all' }),
              getRepositoryIssues(repo.full_name, accessToken, { state: 'all' })
            ]);
            if (commits.status === 'fulfilled' && commits.value.length > 0) {
              totalCommits += commits.value.length;
              const commitOperations = commits.value.map(commit => ({
                updateOne: {
                  filter: { userId, sha: commit.sha },
                  update: {
                    $set: {
                      ...commit,
                      userId,
                      organizationId: org.id,
                      repositoryId: repo.id,
                      updatedAt: new Date()
                    }
                  },
                  upsert: true
                }
              }));

              await Commit.bulkWrite(commitOperations, { ordered: false });
            }
            if (pulls.status === 'fulfilled' && pulls.value.length > 0) {
              totalPulls += pulls.value.length;
              const pullOperations = pulls.value.map(pull => ({
                updateOne: {
                  filter: { userId, id: pull.id },
                  update: {
                    $set: {
                      ...pull,
                      userId,
                      organizationId: org.id,
                      repositoryId: repo.id,
                      updatedAt: new Date()
                    }
                  },
                  upsert: true
                }
              }));

              await PullRequest.bulkWrite(pullOperations, { ordered: false });
            }
            if (issues.status === 'fulfilled' && issues.value.length > 0) {
              const realIssues = issues.value.filter(issue => !issue.pull_request);
              if (realIssues.length > 0) {
                totalIssues += realIssues.length;
                const issueOperations = realIssues.map(issue => ({
                  updateOne: {
                    filter: { userId, id: issue.id },
                    update: {
                      $set: {
                        ...issue,
                        userId,
                        organizationId: org.id,
                        repositoryId: repo.id,
                        updatedAt: new Date()
                      }
                    },
                    upsert: true
                  }
                }));

                await Issue.bulkWrite(issueOperations, { ordered: false });
              }
            }
          }

          try {
            const members = await getOrganizationMembers(org.login, accessToken);
            totalUsers += members.length;

            const batchSize = 10;
            for (let i = 0; i < members.length; i += batchSize) {
              const batch = members.slice(i, i + batchSize);
              const userPromises = batch.map(async (member) => {
                try {
                  const userDetails = await getUserDetails(member.login, accessToken);
                  return User.findOneAndUpdate(
                    { userId, id: member.id },
                    { ...userDetails, userId, organizationId: org.id },
                    { upsert: true, new: true }
                  );
                } catch (error) {
                  console.error(` Error fetching user ${member.login}:`, error.message);
                  return null;
                }
              });
              await Promise.all(userPromises);
            }
          } catch (error) {
            console.error(` Error fetching members for ${org.login}:`, error.message);
          }

        } catch (orgError) {
          console.error(` Error processing organization ${org.login}:`, orgError.message);
          continue;
        }
      }
      await GithubIntegration.findByIdAndUpdate(req.githubIntegration._id, {
        lastSyncAt: syncStartTime
      });

      const syncEndTime = new Date();
      const syncDuration = (syncEndTime - syncStartTime) / 1000;

      console.log('\n🎉 GitHub data sync completed');
      console.log(` Stats: ${organizations.length} orgs, ${totalRepos} repos, ${totalCommits} commits, ${totalPulls} pulls, ${totalIssues} issues, ${totalUsers} users`);
      console.log(` Duration: ${syncDuration.toFixed(2)} seconds`);

      res.json({
        success: true,
        message: 'GitHub data synced successfully',
        stats: {
          organizations: organizations.length,
          repositories: totalRepos,
          commits: totalCommits,
          pullRequests: totalPulls,
          issues: totalIssues,
          users: totalUsers,
          syncDuration: `${syncDuration.toFixed(2)} seconds`
        }
      });

    } catch (error) {
      console.error(' GitHub sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Error syncing GitHub data',
        error: error.message
      });
    }
  }

  async getSyncStatus(req, res) {
    try {
      const { lastSyncAt } = req.githubIntegration;
      const [orgCount, repoCount, commitCount, pullCount, issueCount, userCount] = await Promise.all([
        Organization.countDocuments({ userId: req.githubIntegration.userId }),
        Repository.countDocuments({ userId: req.githubIntegration.userId }),
        Commit.countDocuments({ userId: req.githubIntegration.userId }),
        PullRequest.countDocuments({ userId: req.githubIntegration.userId }),
        Issue.countDocuments({ userId: req.githubIntegration.userId }),
        User.countDocuments({ userId: req.githubIntegration.userId })
      ]);

      res.json({
        success: true,
        lastSyncAt,
        dataCounts: {
          organizations: orgCount,
          repositories: repoCount,
          commits: commitCount,
          pullRequests: pullCount,
          issues: issueCount,
          users: userCount
        }
      });

    } catch (error) {
      console.error(' Sync status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting sync status'
      });
    }
  }

  // For Testing Purposes
  async syncJupyterTestData(req, res) {
    try {
      const { accessToken, userId } = req.githubIntegration;
      const syncStartTime = new Date();
      console.log('\nStarting Jupyter test data sync for user:', userId);
      console.log('> Started at:', syncStartTime.toISOString());
      const targetRepos = [
        'jupyter/notebook',      // ~5,000 issues, 2,000 PRs
        'jupyter/jupyterlab',    // ~7,000 issues, 3,000 PRs  
        'jupyter/nbconvert'      // ~1,500 issues, 800 PRs
      ];

      let totalRepos = 0;
      let totalCommits = 0;
      let totalPulls = 0;
      let totalIssues = 0;
      let totalUsers = 0;

      console.log('\n Step 1: Fetching Jupyter organization...');
      const org = await githubAPI('/orgs/jupyter', accessToken);

      await Organization.findOneAndUpdate(
        { userId, id: org.id },
        { ...org, userId, organizationId: org.id },
        { upsert: true, new: true }
      );
      console.log(` Organization stored: ${org.login} (${org.public_repos} public repos)`);

      console.log('\n Step 2: Processing target repositories...');
      for (const repoFullName of targetRepos) {
        console.log(`\n--- Processing ${repoFullName} ---`);

        try {
          const repo = await githubAPI(`/repos/${repoFullName}`, accessToken);
          totalRepos++;

          await Repository.findOneAndUpdate(
            { userId, id: repo.id },
            { ...repo, userId, organizationId: org.id },
            { upsert: true, new: true }
          );
          console.log(` Repository stored: ${repo.name} (⭐ ${repo.stargazers_count})`);

          console.log(` Fetching recent commits for ${repo.name}...`);
          const commits = await fetchAllPages(
            `/repos/${repoFullName}/commits`,
            accessToken,
            { per_page: 100 },
            4 // <--- control the numbers of synced data
          );
          totalCommits += commits.length;

          const commitPromises = commits.map(commit =>
            Commit.findOneAndUpdate(
              { userId, sha: commit.sha },
              { ...commit, userId, organizationId: org.id, repositoryId: repo.id },
              { upsert: true, new: true }
            )
          );
          await Promise.all(commitPromises);
          console.log(` ${commits.length} commits stored`);

          console.log(` Fetching recent pull requests for ${repo.name}...`);
          const pulls = await fetchAllPages(
            `/repos/${repoFullName}/pulls`,
            accessToken,
            { state: 'all', sort: 'updated', direction: 'desc', per_page: 100 },
            3 // <--- control the numbers of synced data
          );
          totalPulls += pulls.length;

          const pullPromises = pulls.map(pull =>
            PullRequest.findOneAndUpdate(
              { userId, id: pull.id },
              { ...pull, userId, organizationId: org.id, repositoryId: repo.id },
              { upsert: true, new: true }
            )
          );
          await Promise.all(pullPromises);
          console.log(` ${pulls.length} pull requests stored`);

          console.log(`🐛 Fetching recent issues for ${repo.name}...`);
          const issues = await fetchAllPages(
            `/repos/${repoFullName}/issues`,
            accessToken,
            { state: 'all', sort: 'updated', direction: 'desc', per_page: 100 },
            3 // <--- control the numbers of synced data
          );

          const realIssues = issues.filter(issue => !issue.pull_request);
          totalIssues += realIssues.length;

          const issuePromises = realIssues.map(issue =>
            Issue.findOneAndUpdate(
              { userId, id: issue.id },
              { ...issue, userId, organizationId: org.id, repositoryId: repo.id },
              { upsert: true, new: true }
            )
          );
          await Promise.all(issuePromises);
          console.log(` ${realIssues.length} issues stored (filtered out ${issues.length - realIssues.length} PRs)`);

        } catch (repoError) {
          console.error(` Error processing ${repoFullName}:`, repoError.message);
          continue; // Skip this repo and continue with others
        }
      }

      console.log('\n Step 3: Fetching organization members...');
      try {
        const members = await githubAPI('/orgs/jupyter/members', accessToken, { per_page: 30 });
        totalUsers = members.length;

        const userPromises = members.slice(0, 30).map(async (member) => {
          try {
            const userDetails = await githubAPI(`/users/${member.login}`, accessToken);
            return User.findOneAndUpdate(
              { userId, id: member.id },
              { ...userDetails, userId, organizationId: org.id },
              { upsert: true, new: true }
            );
          } catch (userError) {
            console.error(` Error fetching user ${member.login}:`, userError.message);
            return null;
          }
        });

        await Promise.all(userPromises);
        console.log(` ${Math.min(members.length, 20)} organization members stored`);

      } catch (membersError) {
        console.error(' Error fetching organization members:', membersError.message);
      }

      // 4. Update integration sync time
      await GithubIntegration.findByIdAndUpdate(req.githubIntegration._id, {
        lastSyncAt: syncStartTime
      });

      const syncEndTime = new Date();
      const syncDuration = (syncEndTime - syncStartTime) / 1000;

      // Final summary
      console.log('\n🎉 Jupyter Test Data Sync Completed!');
      console.log('='.repeat(50));
      console.log(`   Final Statistics:`);
      console.log(`   Organizations: 1 (jupyter)`);
      console.log(`   Repositories: ${totalRepos}`);
      console.log(`   Commits: ${totalCommits}`);
      console.log(`   Pull Requests: ${totalPulls}`);
      console.log(`   Issues: ${totalIssues}`);
      console.log(`   Users: ${totalUsers}`);
      console.log(`   Duration: ${syncDuration.toFixed(2)} seconds`);
      console.log(`   Completed at: ${syncEndTime.toISOString()}`);
      console.log('='.repeat(50));

      res.json({
        success: true,
        message: 'Jupyter test data synced successfully',
        stats: {
          organizations: 1,
          repositories: totalRepos,
          commits: totalCommits,
          pullRequests: totalPulls,
          issues: totalIssues,
          users: totalUsers,
          syncDuration: `${syncDuration.toFixed(2)} seconds`,
          note: 'Limited dataset for testing - recent data only from 3 key repositories'
        }
      });

    } catch (error) {
      console.error(' Jupyter sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Error syncing Jupyter test data',
        error: error.message
      });
    }
  }
}
export default new GitHubController();