/**
 * SSIET CSE Department - Platform Adapter Factory
 */

const { GitHubAdapter } = require('./github/adapter');
const { LeetCodeAdapter } = require('./leetcode/adapter');
const { CodeforcesAdapter } = require('./codeforces/adapter');
const { CodeChefAdapter } = require('./codechef/adapter');
const { GeeksforGeeksAdapter } = require('./geeksforgeeks/adapter');
const { HackerRankAdapter } = require('./hackerrank/adapter');
const { KaggleAdapter } = require('./kaggle/adapter');
const { PLATFORM_REGISTRY, getPlatformMeta, getAllPlatforms } = require('./registry');

const adapters = {
  github: new GitHubAdapter(),
  leetcode: new LeetCodeAdapter(),
  codeforces: new CodeforcesAdapter(),
  codechef: new CodeChefAdapter(),
  geeksforgeeks: new GeeksforGeeksAdapter(),
  hackerrank: new HackerRankAdapter(),
  kaggle: new KaggleAdapter(),
};

function getAdapter(platformCode) {
  if (!platformCode) return null;
  return adapters[platformCode.toLowerCase()] || null;
}

module.exports = {
  getAdapter,
  adapters,
  PLATFORM_REGISTRY,
  getPlatformMeta,
  getAllPlatforms,
};
