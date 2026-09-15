import { describe, it, expect } from 'vitest';
import { scoringEngine } from '../services/scoringEngine';
import { normalizationEngine } from '../services/normalizationEngine';
import { SCORING_CONFIG } from '../config/scoringConfig';
import { GitHubAdapter } from '../platforms/github/adapter';
import { LeetCodeAdapter } from '../platforms/leetcode/adapter';
import { CodeforcesAdapter } from '../platforms/codeforces/adapter';
import { HackerRankAdapter } from '../platforms/hackerrank/adapter';

describe('Scoring Engine Property & Robustness Invariants', () => {
  const dummyStudent = { id: 'usr_edge_1', name: 'Edge Case User', roll_no: '22CSE999' };

  it('verifies category weights strictly sum to 1.00 (100%)', () => {
    const totalWeight = Object.values(SCORING_CONFIG.weights).reduce((a, b) => a + b, 0);
    expect(Math.round(totalWeight * 100) / 100).toBe(1.0);
  });

  it('records scoring_version v1 in every calculation', () => {
    const score = scoringEngine.calculateStudentScore(dummyStudent, [], []);
    expect(score.scoring_version).toBe('v1');
    expect(score.explanation.scoring_version).toBe('v1');
  });

  describe('Bounded Breadth Model', () => {
    it('awards 0 breadth bonus for 0 or 1 active platform', () => {
      const oneConn = [{
        platform_code: 'github',
        username: 'octocat',
        connection_status: 'connected',
        raw_metrics: { publicRepos: 5, starsReceived: 10 },
      }];
      const res = scoringEngine.calculateStudentScore(dummyStudent, oneConn, []);
      expect(res.explanation.breadth_bonus).toBe(0);
    });

    it('awards 10 pts for 2 active platforms with score >= 20', () => {
      const twoConns = [
        { platform_code: 'github', username: 'dev1', connection_status: 'connected', raw_metrics: { publicRepos: 5, starsReceived: 10 } },
        { platform_code: 'leetcode', username: 'dev1', connection_status: 'connected', raw_metrics: { easySolved: 50 } },
      ];
      const res = scoringEngine.calculateStudentScore(dummyStudent, twoConns, []);
      expect(res.explanation.breadth_bonus).toBe(10);
    });

    it('strictly caps breadth bonus at 40 pts regardless of platform count', () => {
      // 6 simulated active platforms
      const sixConns = [
        { platform_code: 'github', username: 'dev1', connection_status: 'connected', raw_metrics: { publicRepos: 10, starsReceived: 50 } },
        { platform_code: 'leetcode', username: 'dev1', connection_status: 'connected', raw_metrics: { mediumSolved: 100 } },
        { platform_code: 'codeforces', username: 'dev1', connection_status: 'connected', raw_metrics: { rating: 1600 } },
        { platform_code: 'codechef', username: 'dev1', connection_status: 'connected', raw_metrics: { rating: 1500 } },
        { platform_code: 'hackerrank', username: 'dev1', connection_status: 'connected', raw_metrics: { badges: 5 } },
        { platform_code: 'kaggle', username: 'dev1', connection_status: 'connected', raw_metrics: { competitionsCount: 2 } },
      ];
      const res = scoringEngine.calculateStudentScore(dummyStudent, sixConns, []);
      expect(res.explanation.breadth_bonus).toBeLessThanOrEqual(SCORING_CONFIG.breadth.max_breadth_bonus);
      expect(res.explanation.breadth_bonus).toBe(20); // only github, leetcode, and codeforces generate score >= 20 (pending platforms produce 0)
    });

    it('does NOT award breadth bonus for connected platforms that have zero or idle score', () => {
      const idleConns = [
        { platform_code: 'github', username: 'empty1', connection_status: 'connected', raw_metrics: { publicRepos: 0 } },
        { platform_code: 'leetcode', username: 'empty2', connection_status: 'connected', raw_metrics: { easySolved: 0 } },
        { platform_code: 'codeforces', username: 'empty3', connection_status: 'connected', raw_metrics: { rating: 0 } },
      ];
      const res = scoringEngine.calculateStudentScore(dummyStudent, idleConns, []);
      expect(res.explanation.breadth_bonus).toBe(0);
    });
  });

  describe('Extreme Values, Caps, & Nan Handling', () => {
    it('never produces NaN, Infinity, or negative scores on absurd or corrupt inputs', () => {
      const corruptConns = [{
        platform_code: 'github',
        username: 'corrupt',
        connection_status: 'connected',
        raw_metrics: {
          publicRepos: NaN,
          starsReceived: -500,
          forksReceived: null,
          followers: undefined,
          publicGists: 'invalid_string',
        },
      }];

      const res = scoringEngine.calculateStudentScore(dummyStudent, corruptConns, []);
      expect(Number.isFinite(res.overall_score)).toBe(true);
      expect(res.overall_score).toBeGreaterThanOrEqual(0);
      expect(res.overall_score).toBeLessThanOrEqual(1000);
    });

    it('caps absurdly high problem counts at platform and category max (diminishing returns)', () => {
      const absurdLeetCode = [{
        platform_code: 'leetcode',
        username: 'god_tier',
        connection_status: 'connected',
        raw_metrics: {
          easySolved: 100000,
          mediumSolved: 50000,
          hardSolved: 20000,
          contestRating: 3500,
        },
      }];

      const res = scoringEngine.calculateStudentScore(dummyStudent, absurdLeetCode, []);
      expect(res.problem_solving_score).toBeLessThanOrEqual(1000);
      expect(res.overall_score).toBeLessThanOrEqual(1000);
    });

    it('caps Codeforces rating at max rating points', () => {
      const cf = new CodeforcesAdapter();
      const norm = cf.normalizeMetrics({ rating: 4000, maxRating: 4000, problemsSolved: 5000 });
      expect(norm.score).toBeLessThanOrEqual(1000);
      expect(norm.breakdown.rating_points).toBeLessThanOrEqual(SCORING_CONFIG.platforms.codeforces.max_rating_points);
    });

    it('preserves last valid snapshot when a platform sync reports failure', () => {
      const lastKnownGood = {
        platform_code: 'github',
        username: 'octocat',
        connection_status: 'connected',
        sync_status: 'failed', // failed sync!
        raw_metrics: { publicRepos: 12, starsReceived: 30 }, // but has preserved snapshot
        last_synced_at: '2026-09-14T10:00:00.000Z',
      };

      const res = scoringEngine.calculateStudentScore(dummyStudent, [lastKnownGood], []);
      // Score is preserved from last known good snapshot, not reset to 0!
      expect(res.open_source_score).toBeGreaterThan(0);
      expect(res.platform_breakdown.github.sync_status).toBe('failed');
    });
  });

  describe('Explainability & Attribution Tree', () => {
    it('constructs a full mathematical path from overall -> category -> platform -> metric', () => {
      const conns = [
        {
          platform_code: 'github',
          username: 'octocat',
          connection_status: 'connected',
          raw_metrics: { publicRepos: 10, starsReceived: 20 },
        },
        {
          platform_code: 'leetcode',
          username: 'tourist_lc',
          connection_status: 'connected',
          raw_metrics: { easySolved: 80, mediumSolved: 40, hardSolved: 10 },
        },
      ];

      const res = scoringEngine.calculateStudentScore(dummyStudent, conns, []);
      const expl = res.explanation;

      expect(expl.formula).toContain('OverallScore');
      expect(expl.categories.problem_solving.weight).toBe(0.35);
      expect(expl.categories.open_source.weight).toBe(0.20);
      expect(expl.categories.problem_solving.platforms.length).toBeGreaterThan(0);
      expect(expl.categories.open_source.platforms.length).toBeGreaterThan(0);
    });
  });
});
