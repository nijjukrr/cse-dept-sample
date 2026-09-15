import { describe, it, expect, vi } from 'vitest';
import { resolvePlatformConnectionStatus } from './competitiveHelpers.js';
import { parseErrorMessage } from './errorHandler.js';

describe('Verification Workflow & Status Mapping', () => {
  describe('resolvePlatformConnectionStatus', () => {
    it('returns UNLINKED status for missing or disconnected platform', () => {
      const res = resolvePlatformConnectionStatus(null, { code: 'github', name: 'GitHub' });
      expect(res.statusKey).toBe('UNLINKED');
      expect(res.badgeVariant).toBe('outline');
      expect(res.badgeText).toBe('Unlinked');
      expect(res.ctaType).toBe('connect');
      expect(res.isVerified).toBe(false);
      expect(res.isLinked).toBe(false);
    });

    it('returns LINKED_UNVERIFIED status for connected but unverified account', () => {
      const conn = {
        platform_code: 'leetcode',
        username: 'coder123',
        connection_status: 'connected',
        ownership_status: 'unverified',
        platform_score: 0,
      };
      const res = resolvePlatformConnectionStatus(conn, { code: 'leetcode', name: 'LeetCode' });
      expect(res.statusKey).toBe('LINKED_UNVERIFIED');
      expect(res.badgeVariant).toBe('linked');
      expect(res.badgeText).toBe('Linked');
      expect(res.secondaryText).toBe('Ownership not verified');
      expect(res.pointsText).toBe('0 points because ownership is not verified');
      expect(res.ctaType).toBe('verify');
      expect(res.isVerified).toBe(false);
      expect(res.isLinked).toBe(true);
    });

    it('returns VERIFIED status for verified ownership account', () => {
      const conn = {
        platform_code: 'codeforces',
        username: 'tourist',
        connection_status: 'connected',
        ownership_status: 'verified',
        platform_score: 350,
      };
      const res = resolvePlatformConnectionStatus(conn, { code: 'codeforces', name: 'Codeforces' });
      expect(res.statusKey).toBe('VERIFIED');
      expect(res.badgeVariant).toBe('verified');
      expect(res.badgeText).toBe('✓ Verified');
      expect(res.secondaryText).toBe('Eligible for leaderboard scoring');
      expect(res.pointsText).toBe('+350 pts');
      expect(res.ctaType).toBe('sync');
      expect(res.isVerified).toBe(true);
      expect(res.isLinked).toBe(true);
    });

    it('returns VERIFICATION_FAILED status when ownership confirmation failed', () => {
      const conn = {
        platform_code: 'github',
        username: 'fakeuser',
        connection_status: 'connected',
        ownership_status: 'failed',
      };
      const res = resolvePlatformConnectionStatus(conn, { code: 'github', name: 'GitHub' });
      expect(res.statusKey).toBe('VERIFICATION_FAILED');
      expect(res.badgeVariant).toBe('verification_failed');
      expect(res.badgeText).toBe('Verification Failed');
      expect(res.ctaType).toBe('verify');
      expect(res.isVerified).toBe(false);
    });

    it('returns SYNC_FAILED while preserving verified eligibility when snapshot remains valid', () => {
      const conn = {
        platform_code: 'leetcode',
        username: 'neetcoder',
        connection_status: 'connected',
        ownership_status: 'verified',
        sync_status: 'failed',
        platform_score: 120,
      };
      const res = resolvePlatformConnectionStatus(conn, { code: 'leetcode', name: 'LeetCode' });
      expect(res.statusKey).toBe('SYNC_FAILED');
      expect(res.badgeVariant).toBe('sync_failed');
      expect(res.badgeText).toBe('Sync Failed');
      expect(res.scoreEligibilityText).toContain('Eligible for leaderboard scoring');
      expect(res.pointsText).toBe('+120 pts');
      expect(res.ctaType).toBe('sync');
      expect(res.isVerified).toBe(true);
    });

    it('returns INTEGRATION_PENDING for pending platform definition', () => {
      const res = resolvePlatformConnectionStatus(null, {
        code: 'codechef',
        name: 'CodeChef',
        integrationStatus: 'integration_pending',
      });
      expect(res.statusKey).toBe('INTEGRATION_PENDING');
      expect(res.badgeVariant).toBe('pending');
      expect(res.badgeText).toBe('Integration Pending');
      expect(res.secondaryText).toBe('Platform data is not currently included in competitive scoring.');
      expect(res.ctaType).toBe('none');
    });

    it('distinguishes 0 points due to unverified ownership vs 0 points due to no activity', () => {
      const unverifiedConn = {
        platform_code: 'github',
        username: 'dev',
        connection_status: 'connected',
        ownership_status: 'unverified',
        platform_score: 0,
      };
      const verifiedNoActivityConn = {
        platform_code: 'github',
        username: 'newdev',
        connection_status: 'connected',
        ownership_status: 'verified',
        platform_score: 0,
      };

      const unverifiedRes = resolvePlatformConnectionStatus(unverifiedConn);
      const verifiedRes = resolvePlatformConnectionStatus(verifiedNoActivityConn);

      expect(unverifiedRes.pointsText).toBe('0 points because ownership is not verified');
      expect(verifiedRes.pointsText).toBe('+0 pts');
    });
  });

  describe('Human-Readable Error Handling', () => {
    it('converts raw API errors into clean human-readable text', () => {
      const rawError = {
        response: {
          data: {
            error: 'Verification token not found on profile',
          },
        },
      };
      const parsed = parseErrorMessage(rawError);
      expect(parsed).toBe('Verification token not found on profile');
    });

    it('provides clear fallbacks for network or server errors', () => {
      expect(parseErrorMessage(null, 'Network connection failed')).toBe('Network connection failed');
    });
  });
});
