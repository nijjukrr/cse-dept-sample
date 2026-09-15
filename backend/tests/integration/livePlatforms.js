/**
 * SSIET CSE Department - Opt-in Live Platform Integration Test
 * 
 * EXECUTION:
 * npm run test:integration
 * 
 * Tests real live external platform connectivity against public accounts.
 * Separated from regular unit tests to preserve offline repeatability.
 */

const { GitHubAdapter } = require('../../platforms/github/adapter');
const { LeetCodeAdapter } = require('../../platforms/leetcode/adapter');
const { CodeforcesAdapter } = require('../../platforms/codeforces/adapter');
const { HackerRankAdapter } = require('../../platforms/hackerrank/adapter');

async function runLiveIntegrationProbe() {
  console.log('====================================================');
  console.log(' SSIET CSE PLATFORM: LIVE INTEGRATION VERIFICATION ');
  console.log('====================================================\n');

  const report = {
    testedAt: new Date().toISOString(),
    platforms: {},
  };

  // 1. GitHub Live Probe
  console.log('[1/4] Probing GitHub Public REST API...');
  const gh = new GitHubAdapter();
  try {
    const ghRes = await gh.fetchProfile('octocat');
    if (ghRes.success) {
      console.log('  -> SUCCESS: GitHub user "octocat" verified.');
      console.log(`     Public Repos: ${ghRes.data.publicRepos}, Followers: ${ghRes.data.followers}`);
      report.platforms.github = {
        status: 'VERIFIED_LIVE',
        endpoint: 'https://api.github.com/users/:username',
        sampleUser: 'octocat',
        metricsReceived: Object.keys(ghRes.data),
      };
    } else {
      console.log(`  -> FAILED/THROTTLED: ${ghRes.error}`);
      report.platforms.github = { status: 'FAILED_OR_RATE_LIMITED', error: ghRes.error };
    }
  } catch (err) {
    console.log(`  -> ERROR: ${err.message}`);
    report.platforms.github = { status: 'ERROR', error: err.message };
  }

  // 2. LeetCode GraphQL Live Probe
  console.log('\n[2/4] Probing LeetCode Public GraphQL Endpoint...');
  const lc = new LeetCodeAdapter();
  try {
    const lcRes = await lc.fetchProfile('NeetCode');
    if (lcRes.success) {
      console.log('  -> SUCCESS: LeetCode user "NeetCode" verified.');
      console.log(`     Total Solved: ${lcRes.data.totalSolved} (Easy: ${lcRes.data.easySolved}, Medium: ${lcRes.data.mediumSolved}, Hard: ${lcRes.data.hardSolved})`);
      report.platforms.leetcode = {
        status: 'VERIFIED_LIVE',
        endpoint: 'https://leetcode.com/graphql',
        sampleUser: 'NeetCode',
        totalSolved: lcRes.data.totalSolved,
      };
    } else {
      console.log(`  -> FAILED/THROTTLED: ${lcRes.error}`);
      report.platforms.leetcode = { status: 'FAILED_OR_CHALLENGED', error: lcRes.error };
    }
  } catch (err) {
    console.log(`  -> ERROR: ${err.message}`);
    report.platforms.leetcode = { status: 'ERROR', error: err.message };
  }

  // 3. Codeforces Official REST API Probe
  console.log('\n[3/4] Probing Codeforces Official REST API...');
  const cf = new CodeforcesAdapter();
  try {
    const cfRes = await cf.fetchProfile('tourist');
    if (cfRes.success) {
      console.log('  -> SUCCESS: Codeforces user "tourist" verified.');
      console.log(`     Rating: ${cfRes.data.rating}, Max Rating: ${cfRes.data.maxRating}, Rank: ${cfRes.data.rank}`);
      report.platforms.codeforces = {
        status: 'VERIFIED_LIVE',
        endpoint: 'https://codeforces.com/api/user.info',
        sampleUser: 'tourist',
        rating: cfRes.data.rating,
      };
    } else {
      console.log(`  -> FAILED/THROTTLED: ${cfRes.error}`);
      report.platforms.codeforces = { status: 'FAILED_OR_THROTTLED', error: cfRes.error };
    }
  } catch (err) {
    console.log(`  -> ERROR: ${err.message}`);
    report.platforms.codeforces = { status: 'ERROR', error: err.message };
  }

  // 4. HackerRank Audit Verification
  console.log('\n[4/4] Verifying HackerRank Trust Policy...');
  const hr = new HackerRankAdapter();
  const hrRes = await hr.fetchProfile('tourist');
  console.log(`  -> STATUS: ${hrRes.data.statusNote}`);
  report.platforms.hackerrank = {
    status: 'INTEGRATION_PENDING',
    policy: 'No unauthorized scraping; handle linked only without synthetic scores.',
  };

  console.log('\n====================================================');
  console.log(' LIVE PROBE COMPLETE: ALL RESULTS LOGGED SAFELY    ');
  console.log('====================================================\n');
}

runLiveIntegrationProbe();
