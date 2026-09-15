/**
 * SSIET CSE Department - Kaggle Platform Adapter
 * 
 * AUDIT STATUS: INTEGRATION PENDING
 * Official Kaggle API requires individual student API tokens (kaggle.json).
 * We do NOT collect private API keys from students in this phase.
 * 
 * This adapter links the verified public profile handle without generating
 * fabricated or speculative scores.
 */

const { BasePlatformAdapter } = require('../baseAdapter');
const { SCORING_CONFIG } = require('../../config/scoringConfig');

class KaggleAdapter extends BasePlatformAdapter {
  constructor(config = {}) {
    super('kaggle', config);
    this.profileBase = 'https://www.kaggle.com';
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
        statusNote: 'Handle linked. Official Kaggle API key integration pending.',
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  async fetchMetrics(username) {
    return this.fetchProfile(username);
  }

  normalizeMetrics(rawMetrics) {
    const cfg = SCORING_CONFIG.platforms.kaggle;

    return {
      platform: 'kaggle',
      category: cfg.category,
      raw_score: 0,
      score: 0,
      metrics: {
        competitions_count: 0,
        notebooks_count: 0,
        datasets_count: 0,
      },
      breakdown: {
        competition_points: 0,
        notebook_points: 0,
      },
      confidence: 'low',
      verification_level: 'public_profile_linked',
      source_type: 'unsupported',
      data_status: 'unavailable',
      note: 'Kaggle official token-based integration pending.',
      fetched_at: rawMetrics?.fetchedAt || new Date().toISOString(),
    };
  }
}

module.exports = { KaggleAdapter };
