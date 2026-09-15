/**
 * SSIET CSE Department - CodeChef Platform Adapter
 * 
 * AUDIT STATUS: INTEGRATION PENDING
 * CodeChef does not offer an official open public JSON API.
 * HTML scraping is disabled per department anti-scraping policy.
 * 
 * This adapter links the verified public profile handle without generating
 * fabricated or speculative scores.
 */

const { BasePlatformAdapter } = require('../baseAdapter');
const { SCORING_CONFIG } = require('../../config/scoringConfig');

class CodeChefAdapter extends BasePlatformAdapter {
  constructor(config = {}) {
    super('codechef', config);
    this.profileBase = 'https://www.codechef.com/users';
  }

  async fetchProfile(username) {
    const check = this.validateUsername(username);
    if (!check.isValid) {
      return { success: false, error: check.reason, errorCategory: 'INVALID_INPUT' };
    }

    const cleanUsername = check.cleanUsername;
    const profileUrl = `${this.profileBase}/${cleanUsername}`;

    return {
      success: true,
      data: {
        username: cleanUsername,
        profileUrl,
        integrationStatus: 'integration_pending',
        isVerified: false,
        statusNote: 'Handle linked. Official CodeChef API integration pending.',
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  async fetchMetrics(username) {
    return this.fetchProfile(username);
  }

  normalizeMetrics(rawMetrics) {
    const cfg = SCORING_CONFIG.platforms.codechef;

    return {
      platform: 'codechef',
      category: cfg.category,
      raw_score: 0,
      score: 0,
      metrics: {
        rating: 0,
        stars: 0,
        problems_solved: 0,
      },
      breakdown: {
        rating_points: 0,
        star_points: 0,
      },
      confidence: 'low',
      verification_level: 'public_profile_linked',
      source_type: 'unsupported',
      data_status: 'unavailable',
      note: 'CodeChef official API integration pending.',
      fetched_at: rawMetrics?.fetchedAt || new Date().toISOString(),
    };
  }
}

module.exports = { CodeChefAdapter };
