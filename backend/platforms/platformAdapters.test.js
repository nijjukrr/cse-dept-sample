const registry = require('./registry');
const { calculateCompetitiveScore, rankStudentsDeterministically } = require('../services/scoringEngine');

describe('Competitive Platform Adapters & Normalization Engine', () => {
  const github = registry.getAdapter('github');
  const leetcode = registry.getAdapter('leetcode');
  const codeforces = registry.getAdapter('codeforces');
  const hackerrank = registry.getAdapter('hackerrank');

  describe('Username Validation', () => {
    it('validates GitHub usernames', () => {
      expect(github.validateUsername('torvalds').isValid).toBe(true);
      expect(github.validateUsername('john-doe').isValid).toBe(true);
      expect(github.validateUsername('-invalid').isValid).toBe(false);
      expect(github.validateUsername('').isValid).toBe(false);
    });

    it('validates LeetCode usernames', () => {
      expect(leetcode.validateUsername('coder_123').isValid).toBe(true);
      expect(leetcode.validateUsername('ab').isValid).toBe(false);
      expect(leetcode.validateUsername('').isValid).toBe(false);
    });

    it('validates Codeforces handles', () => {
      expect(codeforces.validateUsername('tourist').isValid).toBe(true);
      expect(codeforces.validateUsername('a').isValid).toBe(false);
    });
  });

  describe('Metric Normalization & Scoring', () => {
    it('normalizes GitHub metrics deterministically', () => {
      const raw = {
        public_repos: 15,
        total_stars: 20,
        total_forks: 5,
        followers: 12,
      };

      const norm = github.normalizeMetrics(raw);
      expect(norm.category).toBe('open_source');
      expect(norm.metrics.public_repos).toBe(15);
      expect(norm.metrics.total_stars).toBe(20);

      const score = github.calculatePlatformScore(norm);
      expect(score).toBeGreaterThan(0);
      expect(typeof score).toBe('number');
    });

    it('normalizes LeetCode metrics with difficulty weights', () => {
      const raw = {
        total_solved: 350,
        easy_solved: 150,
        medium_solved: 160,
        hard_solved: 40,
        ranking: 25000,
      };

      const norm = leetcode.normalizeMetrics(raw);
      expect(norm.category).toBe('problem_solving');
      expect(norm.metrics.hard_solved).toBe(40);

      const score = leetcode.calculatePlatformScore(norm);
      // Easy (capped at 100) + Medium (160*3=480 capped at 240) + Hard (40*7=280) + rankBonus (30)
      expect(score).toBe(100 + 240 + 280 + 30);
    });

    it('normalizes Codeforces competitive rating', () => {
      const raw = {
        rating: 1550,
        max_rating: 1620,
        rank: 'specialist',
        max_rank: 'expert',
        problems_solved: 80,
      };

      const norm = codeforces.normalizeMetrics(raw);
      expect(norm.category).toBe('competitive_programming');

      const score = codeforces.calculatePlatformScore(norm);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Department Scoring Engine & Tie-Breaking', () => {
    it('calculates deterministic overall score and explainability breakdown', () => {
      const connections = [
        {
          platform_code: 'leetcode',
          platform_score: 280,
          normalized_metrics: { category: 'problem_solving' },
          sync_status: 'success',
        },
        {
          platform_code: 'codeforces',
          platform_score: 220,
          normalized_metrics: { category: 'competitive_programming' },
          sync_status: 'success',
        },
        {
          platform_code: 'github',
          platform_score: 150,
          normalized_metrics: { category: 'open_source' },
          sync_status: 'success',
        },
      ];

      const result1 = calculateCompetitiveScore(connections);
      const result2 = calculateCompetitiveScore(connections);

      // Determinism
      expect(result1.overall_score).toBe(result2.overall_score);
      expect(result1.overall_score).toBeGreaterThan(0);
      expect(result1.breadth_bonus).toBe(30); // 3 categories -> (3-1)*15 = 30 bonus
      expect(result1.category_breakdown.problem_solving.score).toBe(280);
      expect(result1.category_breakdown.competitive_programming.score).toBe(Math.round(220 * 1.1));
      expect(result1.category_breakdown.open_source.score).toBe(Math.round(150 * 0.95));
    });

    it('breaks ties deterministically using CP score, PS score, and alphabetical order', () => {
      const students = [
        {
          id: 'user-b',
          name: 'Bob',
          overall_score: 500,
          competitive_programming_score: 180,
          problem_solving_score: 200,
          open_source_score: 120,
        },
        {
          id: 'user-a',
          name: 'Alice',
          overall_score: 500,
          competitive_programming_score: 220, // higher CP score should win tie
          problem_solving_score: 160,
          open_source_score: 120,
        },
        {
          id: 'user-c',
          name: 'Charlie',
          overall_score: 600,
          competitive_programming_score: 100,
          problem_solving_score: 300,
          open_source_score: 200,
        },
      ];

      const ranked = rankStudentsDeterministically(students);
      expect(ranked[0].id).toBe('user-c'); // 600 pts -> rank 1
      expect(ranked[1].id).toBe('user-a'); // 500 pts with higher CP (220) -> rank 2
      expect(ranked[2].id).toBe('user-b'); // 500 pts with lower CP (180) -> rank 3
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].rank).toBe(3);
    });
  });

  describe('Freshness Status', () => {
    it('evaluates freshness based on timestamp', () => {
      const now = new Date();
      expect(github.getFreshness(now.toISOString())).toBe('fresh');

      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      expect(github.getFreshness(twoDaysAgo.toISOString())).toBe('stale');

      expect(github.getFreshness(null)).toBe('never');
    });
  });
});
