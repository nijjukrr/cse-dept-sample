/**
 * SSIET CSE Department - Platform Metadata Registry
 * Unified metadata for external competitive and developer platforms.
 * Establishes honest trust levels, source types, and verification models.
 */

const PLATFORM_REGISTRY = {
  github: {
    code: 'github',
    name: 'GitHub',
    category: 'open_source',
    categoryLabel: 'Open Source & Projects',
    brandColor: '#24292e',
    accentColor: '#10b981',
    profileUrlTemplate: 'https://github.com/{username}',
    sourceType: 'documented_public_api',
    integrationStatus: 'verified_live',
    verificationLevel: 'verified_public_api',
    isSupported: true,
    supportedMetrics: [
      'public_repos',
      'followers',
      'following',
      'public_gists',
      'stars_received',
      'forks_received',
      'created_at',
    ],
    description: 'Repositories, open source project portfolio, stars, and forks impact.',
    note: 'Metrics reflect verified public repository data. Does not claim private contributions without OAuth.',
  },

  leetcode: {
    code: 'leetcode',
    name: 'LeetCode',
    category: 'problem_solving',
    categoryLabel: 'Problem Solving',
    brandColor: '#FFA116',
    accentColor: '#f59e0b',
    profileUrlTemplate: 'https://leetcode.com/{username}',
    sourceType: 'public_endpoint', // Undocumented GraphQL endpoint
    integrationStatus: 'verified_live',
    verificationLevel: 'verified_public_api',
    isSupported: true,
    supportedMetrics: [
      'total_solved',
      'easy_solved',
      'medium_solved',
      'hard_solved',
      'ranking',
      'contest_rating',
      'contests_attended',
    ],
    description: 'Algorithmic problem solving across Easy, Medium, and Hard difficulty tiers.',
    note: 'Queried via public GraphQL endpoint. Subject to Cloudflare challenges if called excessively.',
  },

  codeforces: {
    code: 'codeforces',
    name: 'Codeforces',
    category: 'competitive_programming',
    categoryLabel: 'Competitive Programming',
    brandColor: '#1F8ACB',
    accentColor: '#3b82f6',
    profileUrlTemplate: 'https://codeforces.com/profile/{username}',
    sourceType: 'official_api', // Official documented REST API
    integrationStatus: 'verified_live',
    verificationLevel: 'verified_public_api',
    isSupported: true,
    supportedMetrics: [
      'rating',
      'max_rating',
      'rank',
      'max_rank',
      'contribution',
      'problems_solved',
    ],
    description: 'Official division contests, Elo rating, rank tier, and contest performance.',
    note: 'Official Codeforces public API with 1 request per 2 seconds rate-limit constraint.',
  },

  hackerrank: {
    code: 'hackerrank',
    name: 'HackerRank',
    category: 'certifications',
    categoryLabel: 'Problem Solving & Skills',
    brandColor: '#00EA64',
    accentColor: '#10b981',
    profileUrlTemplate: 'https://www.hackerrank.com/{username}',
    sourceType: 'unsupported',
    integrationStatus: 'integration_pending',
    verificationLevel: 'public_profile_linked',
    isSupported: false,
    supportedMetrics: [],
    description: 'Domain skill badges and verified skill certifications.',
    note: 'Integration Pending. HackerRank lacks an unauthenticated public JSON API; public page blocks automated GET.',
  },

  codechef: {
    code: 'codechef',
    name: 'CodeChef',
    category: 'competitive_programming',
    categoryLabel: 'Competitive Programming',
    brandColor: '#5B4638',
    accentColor: '#8b5cf6',
    profileUrlTemplate: 'https://www.codechef.com/users/{username}',
    sourceType: 'unsupported',
    integrationStatus: 'integration_pending',
    verificationLevel: 'public_profile_linked',
    isSupported: false,
    supportedMetrics: [],
    description: 'Divisional contests, star ratings, and contest ratings.',
    note: 'Integration Pending. CodeChef lacks an official open public JSON endpoint. HTML scraping is disabled.',
  },

  geeksforgeeks: {
    code: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    category: 'problem_solving',
    categoryLabel: 'Problem Solving',
    brandColor: '#2F8D46',
    accentColor: '#22c55e',
    profileUrlTemplate: 'https://www.geeksforgeeks.org/user/{username}',
    sourceType: 'unsupported',
    integrationStatus: 'integration_pending',
    verificationLevel: 'public_profile_linked',
    isSupported: false,
    supportedMetrics: [],
    description: 'Data structure practice problems, coding scores, and college ranking.',
    note: 'Integration Pending. GFG lacks an official public JSON API. Handle linking enabled without synthetic scores.',
  },

  kaggle: {
    code: 'kaggle',
    name: 'Kaggle',
    category: 'certifications',
    categoryLabel: 'Data Science & AI',
    brandColor: '#20BEFF',
    accentColor: '#06b6d4',
    profileUrlTemplate: 'https://www.kaggle.com/{username}',
    sourceType: 'unsupported',
    integrationStatus: 'integration_pending',
    verificationLevel: 'public_profile_linked',
    isSupported: false,
    supportedMetrics: [],
    description: 'Data science notebooks, ML competitions, and contributor tiers.',
    note: 'Integration Pending. Requires individual student API tokens (kaggle.json); handle linking enabled.',
  },
};

function getPlatformMeta(code) {
  return PLATFORM_REGISTRY[code?.toLowerCase()] || null;
}

function getAllPlatforms() {
  return Object.values(PLATFORM_REGISTRY);
}

function getAdapter(platformCode) {
  const { getAdapter: fetchAdapter } = require('./index');
  return fetchAdapter(platformCode);
}

module.exports = {
  PLATFORM_REGISTRY,
  getPlatformMeta,
  getAllPlatforms,
  getAdapter,
};
