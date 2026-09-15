/**
 * SSIET CSE Department - GeeksforGeeks Platform Adapter
 * 
 * AUDIT STATUS: INTEGRATION PENDING
 * GeeksforGeeks does not provide an official open public JSON API.
 * HTML scraping is disabled per anti-scraping policy.
 * 
 * This adapter links the verified public profile handle without generating
 * fabricated or speculative scores.
 */

const { BasePlatformAdapter } = require('../baseAdapter');
const { SCORING_CONFIG } = require('../../config/scoringConfig');

class GeeksforGeeksAdapter extends BasePlatformAdapter {
  constructor(config = {}) {
    super('geeksforgeeks', config);
    this.profileBase = 'https://www.geeksforgeeks.org/user';
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
        statusNote: 'Handle linked. Official GFG API integration pending.',
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  async fetchMetrics(username) {
    return this.fetchProfile(username);
  }

  normalizeMetrics(rawMetrics) {
    const cfg = SCORING_CONFIG.platforms.geeksforgeeks;

    return {
      platform: 'geeksforgeeks',
      category: cfg.category,
      raw_score: 0,
      score: 0,
      metrics: {
        problems_solved: 0,
        coding_score: 0,
      },
      breakdown: {
        solved_points: 0,
        score_points: 0,
      },
      confidence: 'low',
      verification_level: 'public_profile_linked',
      source_type: 'unsupported',
      data_status: 'unavailable',
      note: 'GeeksforGeeks official API integration pending.',
      fetched_at: rawMetrics?.fetchedAt || new Date().toISOString(),
    };
  }
}

module.exports = { GeeksforGeeksAdapter };
