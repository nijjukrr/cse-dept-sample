/**
 * SSIET CSE Department - HackerRank Platform Adapter
 * 
 * AUDIT STATUS: INTEGRATION PENDING
 * HackerRank does not expose an official, unauthenticated public REST API.
 * The previous implementation attempted HTML regex scraping on the word 'badge',
 * which is fragile, inaccurate, and violated anti-scraping guidelines.
 * 
 * This adapter links the verified public profile handle without generating
 * fabricated or speculative scores.
 */

const { BasePlatformAdapter } = require('../baseAdapter');
const { SCORING_CONFIG } = require('../../config/scoringConfig');

class HackerRankAdapter extends BasePlatformAdapter {
  constructor(config = {}) {
    super('hackerrank', config);
    this.profileBase = 'https://www.hackerrank.com';
  }

  async fetchProfile(username) {
    const check = this.validateUsername(username);
    if (!check.isValid) {
      return { success: false, error: check.reason, errorCategory: 'INVALID_INPUT' };
    }

    const cleanUsername = check.cleanUsername;
    const profileUrl = `${this.profileBase}/${cleanUsername}`;

    // Return handle-linked profile without attempting unauthorized scraping
    return {
      success: true,
      data: {
        username: cleanUsername,
        profileUrl,
        integrationStatus: 'integration_pending',
        isVerified: false,
        statusNote: 'Handle linked. Official HackerRank API integration pending.',
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  async fetchMetrics(username) {
    return this.fetchProfile(username);
  }

  normalizeMetrics(rawMetrics) {
    const cfg = SCORING_CONFIG.platforms.hackerrank;

    return {
      platform: 'hackerrank',
      category: cfg.category,
      raw_score: 0,
      score: 0, // No fabricated points
      metrics: {
        badges: 0,
        stars: 0,
        certifications: 0,
      },
      breakdown: {
        badge_points: 0,
        star_points: 0,
        cert_points: 0,
      },
      confidence: 'low',
      verification_level: 'public_profile_linked',
      source_type: 'unsupported',
      data_status: 'unavailable',
      note: 'HackerRank official API integration pending.',
      fetched_at: rawMetrics?.fetchedAt || new Date().toISOString(),
    };
  }
}

module.exports = { HackerRankAdapter };
