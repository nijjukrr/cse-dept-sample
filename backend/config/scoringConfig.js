/**
 * SSIET CSE Department - Competitive Scoring Configuration
 * Version: v1
 * 
 * Formal, centralized, and deterministic mathematical rules for normalization,
 * category weighting, bounded breadth bonus, and explicit metric caps.
 * 
 * NO MAGIC NUMBERS IN APPLICATION CODE.
 */

const SCORING_CONFIG = {
  version: 'v1',

  // Category weights (Strict mathematical invariant: Sum must equal 1.00)
  weights: {
    problem_solving: 0.35,          // 35%: LeetCode (and future verified algorithmic platforms)
    competitive_programming: 0.25,  // 25%: Codeforces rating & contests
    open_source: 0.20,              // 20%: GitHub repositories, stars, forks
    certifications: 0.10,           // 10%: Verified external badges & certifications
    college_achievements: 0.10,     // 10%: Department hackathon medals & internships
  },

  // Global caps
  caps: {
    max_overall_score: 1000,
    max_category_score: 1000,
    max_platform_score: 1000,
  },

  // Bounded Breadth Model
  // Prevents inflating score by simply connecting empty/idle accounts
  breadth: {
    max_breadth_bonus: 40,             // Maximum 40 points total (4% of 1000)
    points_per_active_platform: 10,    // 10 points per additional active verified platform
    min_active_platforms: 2,           // Bonus starts only when >= 2 verified active platforms exist
    min_score_for_active: 20,          // Platform must have >= 20 normalized pts to count as active
  },

  // Platform-specific normalization parameters & trust specifications
  platforms: {
    github: {
      category: 'open_source',
      source_type: 'documented_public_api',
      integration_status: 'verified_live',
      max_points: 1000,
      base_active_profile_points: 50,  // Awarded if user has >= 1 public repo
      points_per_public_repo: 5,
      max_repo_points: 150,            // Cap at 30 repos (prevents repo spam)
      points_per_star_received: 15,
      max_star_points: 300,            // Real impact indicator
      points_per_fork_received: 10,
      max_fork_points: 150,
      points_per_follower: 2,
      max_follower_points: 100,
      points_per_public_gist: 2,
      max_gist_points: 50,
    },

    leetcode: {
      category: 'problem_solving',
      source_type: 'public_endpoint',  // Undocumented public GraphQL (not official developer API)
      integration_status: 'verified_live',
      max_points: 1000,
      // Difficulty weighting: Hard is worth much more than Easy
      points_per_easy: 1,
      points_per_medium: 3.5,
      points_per_hard: 8,
      // Contest rating contribution
      rating_baseline: 1300,
      rating_multiplier: 0.5,
      contest_participation_bonus: 5,
      max_contest_points: 250,
      // NOTE: total_solved is NOT added separately to prevent double-counting
    },

    codeforces: {
      category: 'competitive_programming',
      source_type: 'official_api',     // Official documented public REST API
      integration_status: 'verified_live',
      max_points: 1000,
      rating_baseline: 1000,
      rating_multiplier: 0.6,
      max_rating_bonus_multiplier: 0.2,
      max_rating_points: 700,          // 2000+ rating hits 700 pt cap
      max_peak_bonus: 100,
      points_per_problem_solved: 3,
      max_solved_points: 300,
    },

    hackerrank: {
      category: 'certifications',
      source_type: 'unsupported',
      integration_status: 'integration_pending',
      max_points: 0,                   // 0 until official API/OAuth is supported
      note: 'HackerRank lacks a documented public API. Downgraded to handle-linked pending official API.',
    },

    codechef: {
      category: 'competitive_programming',
      source_type: 'unsupported',
      integration_status: 'integration_pending',
      max_points: 0,
      note: 'No unauthenticated official JSON API. Kept honest as Integration Pending.',
    },

    geeksforgeeks: {
      category: 'problem_solving',
      source_type: 'unsupported',
      integration_status: 'integration_pending',
      max_points: 0,
      note: 'No official public JSON API. Kept honest as Integration Pending.',
    },

    kaggle: {
      category: 'certifications',
      source_type: 'unsupported',
      integration_status: 'integration_pending',
      max_points: 0,
      note: 'Requires individual user API keys (kaggle.json). Kept honest as Integration Pending.',
    },

    college_achievements: {
      category: 'college_achievements',
      source_type: 'department_verified',
      integration_status: 'verified_live',
      max_points: 1000,
    },
  },

  // Freshness policy
  freshness: {
    fresh_threshold_hours: 24,         // < 24h = Fresh
    stale_threshold_hours: 168,        // 24h - 7d = Stale (snapshot preserved)
    critical_stale_hours: 720,         // > 30d = Flag for re-sync
    cooldown_minutes_manual_sync: 5,   // Enforced cooldown between manual sync clicks
  },

  // Deterministic tie-breaking hierarchy
  tieBreakingOrder: [
    'overall_score',
    'competitive_programming_score',
    'problem_solving_score',
    'open_source_score',
    'connected_platform_count',
    'user_id', // Final fallback: string comparison on unique UUID (guarantees determinism)
  ],
};

module.exports = { SCORING_CONFIG };
