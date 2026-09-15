const BasePlatformAdapter = require('../BasePlatformAdapter');

class CodeChefAdapter extends BasePlatformAdapter {
  constructor() {
    super('codechef', 'CodeChef', 'Competitive Programming', 'https://codechef.com');
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'CodeChef username is required.' };
    }
    const clean = username.trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      return { isValid: false, error: 'Invalid CodeChef username format.' };
    }
    return { isValid: true };
  }

  async connect(username) {
    const valid = this.validateUsername(username);
    if (!valid.isValid) return { success: false, error: valid.error };

    const cleanUser = username.trim();
    return {
      success: true,
      profileUrl: `https://www.codechef.com/users/${cleanUser}`,
      profileData: {
        username: cleanUser,
        status: 'Handle Verified',
      },
    };
  }

  async fetchMetrics(username) {
    // CodeChef does not provide an open unauthenticated REST API without scraping or OAuth partnership.
    // Return structured pending record rather than fake data.
    return {
      integration_status: 'pending_oauth',
      note: 'CodeChef official API requires partner credentials. Handle linked successfully.',
      current_rating: 0,
      max_rating: 0,
      stars: 'Pending Sync',
      problems_solved: 0,
    };
  }

  validateMetrics(rawMetrics) {
    return Boolean(rawMetrics && typeof rawMetrics === 'object');
  }

  normalizeMetrics(rawMetrics) {
    const rating = rawMetrics.current_rating || 0;
    return {
      category: 'competitive_programming',
      status: rawMetrics.integration_status || 'connected',
      metrics: {
        current_rating: rating,
        max_rating: rawMetrics.max_rating || 0,
        problems_solved: rawMetrics.problems_solved || 0,
      },
      displayMetrics: [
        { label: 'Integration Status', value: 'Handle Linked (Direct API Pending)' },
        { label: 'Current Rating', value: rating > 0 ? rating : 'Sync Pending' },
      ],
    };
  }

  calculatePlatformScore(normalizedMetrics) {
    const { metrics } = normalizedMetrics || {};
    if (!metrics || !metrics.current_rating) return 0;
    return Math.min(Math.round(metrics.current_rating * 0.15), 250);
  }
}

module.exports = new CodeChefAdapter();
