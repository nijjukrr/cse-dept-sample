import { describe, it, expect } from 'vitest';
import {
  getFreshnessStatus,
  calculateCategoryBreakdown,
  sanitizePlatformUsername,
  getPlatformProfileUrl,
} from './competitiveHelpers.js';

describe('Competitive Platform Helpers', () => {
  describe('getFreshnessStatus', () => {
    it('returns never synced when null/undefined', () => {
      expect(getFreshnessStatus(null).status).toBe('never');
      expect(getFreshnessStatus(undefined).status).toBe('never');
    });

    it('returns fresh when updated within 60 minutes', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const res = getFreshnessStatus(tenMinsAgo);
      expect(res.status).toBe('fresh');
      expect(res.label).toContain('m ago');
    });

    it('returns recent when updated within 24 hours', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      const res = getFreshnessStatus(threeHoursAgo);
      expect(res.status).toBe('recent');
      expect(res.label).toContain('3h ago');
    });

    it('returns stale when older than stale threshold', () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const res = getFreshnessStatus(twoDaysAgo);
      expect(res.status).toBe('stale');
      expect(res.label).toBe('Data Stale');
    });
  });

  describe('calculateCategoryBreakdown', () => {
    it('returns empty array when total is 0 or empty', () => {
      expect(calculateCategoryBreakdown({})).toEqual([]);
      expect(calculateCategoryBreakdown({ problem_solving: 0 })).toEqual([]);
    });

    it('calculates exact percentage contribution for explainability', () => {
      const breakdown = calculateCategoryBreakdown({
        problem_solving: 200,
        competitive_programming: 100,
        open_source: 100,
      });
      expect(breakdown).toHaveLength(3);
      expect(breakdown.find(b => b.key === 'problem_solving')?.percentage).toBe(50);
      expect(breakdown.find(b => b.key === 'competitive_programming')?.percentage).toBe(25);
      expect(breakdown.find(b => b.key === 'open_source')?.percentage).toBe(25);
    });
  });

  describe('sanitizePlatformUsername', () => {
    it('extracts raw username from full URL strings correctly', () => {
      expect(sanitizePlatformUsername('https://github.com/torvalds')).toBe('torvalds');
      expect(sanitizePlatformUsername('https://leetcode.com/tourist/')).toBe('tourist');
      expect(sanitizePlatformUsername('https://codeforces.com/profile/tourist')).toBe('tourist');
      expect(sanitizePlatformUsername('https://www.hackerrank.com/coder_123')).toBe('coder_123');
    });

    it('sanitizes input and strips illegal characters', () => {
      expect(sanitizePlatformUsername('  user-name.dev  ')).toBe('user-name.dev');
      expect(sanitizePlatformUsername('user<script>')).toBe('userscript');
    });
  });

  describe('getPlatformProfileUrl', () => {
    it('resolves official platform profile links without spoofing', () => {
      expect(getPlatformProfileUrl('github', 'torvalds')).toBe('https://github.com/torvalds');
      expect(getPlatformProfileUrl('leetcode', 'neetcode')).toBe('https://leetcode.com/neetcode');
      expect(getPlatformProfileUrl('codeforces', 'petr')).toBe('https://codeforces.com/profile/petr');
      expect(getPlatformProfileUrl('unknown', 'test')).toBe('#');
    });
  });
});
