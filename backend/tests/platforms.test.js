import { describe, it, expect, vi } from 'vitest';
import { getAdapter } from '../platforms';
import { GitHubAdapter } from '../platforms/github/adapter';
import { LeetCodeAdapter } from '../platforms/leetcode/adapter';
import { CodeforcesAdapter } from '../platforms/codeforces/adapter';

describe('Platform Adapters Architecture', () => {
  it('loads registered adapters correctly', () => {
    expect(getAdapter('github')).toBeDefined();
    expect(getAdapter('leetcode')).toBeDefined();
    expect(getAdapter('codeforces')).toBeDefined();
    expect(getAdapter('codechef')).toBeDefined();
    expect(getAdapter('geeksforgeeks')).toBeDefined();
    expect(getAdapter('hackerrank')).toBeDefined();
    expect(getAdapter('kaggle')).toBeDefined();
    expect(getAdapter('nonexistent')).toBeNull();
  });

  describe('Username Validation & Security', () => {
    const gh = new GitHubAdapter();

    it('rejects empty or non-string usernames', () => {
      expect(gh.validateUsername('').isValid).toBe(false);
      expect(gh.validateUsername(null).isValid).toBe(false);
      expect(gh.validateUsername(12345).isValid).toBe(false);
    });

    it('rejects usernames with illegal characters or script tags', () => {
      expect(gh.validateUsername('<script>alert(1)</script>').isValid).toBe(false);
      expect(gh.validateUsername('user; DROP TABLE students;--').isValid).toBe(false);
      expect(gh.validateUsername('user name with spaces').isValid).toBe(false);
    });

    it('accepts valid usernames', () => {
      const res = gh.validateUsername('octocat-dev_123');
      expect(res.isValid).toBe(true);
      expect(res.cleanUsername).toBe('octocat-dev_123');
    });
  });

  describe('GitHub Adapter Metric Normalization', () => {
    const gh = new GitHubAdapter();

    it('normalizes mock GitHub raw metrics properly', () => {
      const mockRaw = {
        username: 'coder123',
        publicRepos: 12,
        followers: 45,
        publicGists: 3,
        starsReceived: 25,
        forksReceived: 10,
        fetchedAt: '2026-09-15T10:00:00.000Z',
      };

      const normalized = gh.normalizeMetrics(mockRaw);
      expect(normalized.platform).toBe('github');
      expect(normalized.category).toBe('open_source');
      expect(normalized.score).toBeGreaterThan(0);
      expect(normalized.score).toBeLessThanOrEqual(1000);
      expect(normalized.breakdown.stars).toBe(300); // capped at max_star_points (300)
      expect(normalized.metrics.public_repos).toBe(12);
    });

    it('handles zero or missing fields without crashing', () => {
      const normalized = gh.normalizeMetrics({});
      expect(normalized.score).toBe(0);
      expect(normalized.metrics.public_repos).toBe(0);
    });
  });

  describe('LeetCode Adapter Metric Normalization', () => {
    const lc = new LeetCodeAdapter();

    it('weights Hard problems more heavily than Easy problems', () => {
      const studentEasy = lc.normalizeMetrics({
        easySolved: 50,
        mediumSolved: 0,
        hardSolved: 0,
      });

      const studentHard = lc.normalizeMetrics({
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 50,
      });

      expect(studentHard.score).toBeGreaterThan(studentEasy.score);
      expect(studentHard.breakdown.hard_points).toBe(50 * 8);
      expect(studentEasy.breakdown.easy_points).toBe(50 * 1);
    });

    it('adds contest rating bonus above baseline', () => {
      const unrated = lc.normalizeMetrics({ contestRating: 1200, totalSolved: 50 });
      const rated = lc.normalizeMetrics({ contestRating: 1800, totalSolved: 50 });

      expect(rated.score).toBeGreaterThan(unrated.score);
      expect(rated.breakdown.contest_points).toBeGreaterThan(0);
    });
  });

  describe('Codeforces Adapter Metric Normalization', () => {
    const cf = new CodeforcesAdapter();

    it('normalizes rating and peak rating bonus', () => {
      const mockRaw = {
        handle: 'tourist_jr',
        rating: 1550,
        maxRating: 1650,
        rank: 'specialist',
        problemsSolved: 40,
      };

      const normalized = cf.normalizeMetrics(mockRaw);
      expect(normalized.platform).toBe('codeforces');
      expect(normalized.category).toBe('competitive_programming');
      expect(normalized.breakdown.rating_points).toBeGreaterThan(0);
      expect(normalized.breakdown.problem_points).toBe(40 * 3);
    });
  });
});
