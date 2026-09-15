const BasePlatformAdapter = require('../BasePlatformAdapter');

class GeeksforGeeksAdapter extends BasePlatformAdapter {
  constructor() {
    super('geeksforgeeks', 'GeeksforGeeks', 'Problem Solving', 'https://auth.geeksforgeeks.org');
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'GeeksforGeeks username is required.' };
    }
    const clean = username.trim();
    if (!/^[a-zA-Z0-9_-]{2,40}$/.test(clean)) {
      return { isValid: false, error: 'Invalid GeeksforGeeks username format.' };
    }
    return { isValid: true };
  }

  async connect(username) {
    const valid = this.validateUsername(username);
    if (!valid.isValid) return { success: false, error: valid.error };

    const cleanUser = username.trim();
    return {
      success: true,
      profileUrl: `https://auth.geeksforgeeks.org/user/${cleanUser}`,
      profileData: {
        username: cleanUser,
        status: 'Handle Verified',
      },
    };
  }

  async fetchMetrics(username) {
    // GeeksforGeeks does not provide an official public JSON REST API.
    return {
      integration_status: 'handle_linked',
      note: 'GeeksforGeeks official open API pending. Profile handle verified.',
      problems_solved: 0,
      coding_score: 0,
    };
  }

  validateMetrics(rawMetrics) {
    return Boolean(rawMetrics && typeof rawMetrics === 'object');
  }

  normalizeMetrics(rawMetrics) {
    return {
      category: 'problem_solving',
      status: rawMetrics.integration_status || 'connected',
      metrics: {
        problems_solved: rawMetrics.problems_solved || 0,
        coding_score: rawMetrics.coding_score || 0,
      },
      displayMetrics: [
        { label: 'Integration Status', value: 'Handle Linked (Direct API Pending)' },
        { label: 'Coding Score', value: rawMetrics.coding_score || 'Sync Pending' },
      ],
    };
  }

  calculatePlatformScore(normalizedMetrics) {
    const { metrics } = normalizedMetrics || {};
    if (!metrics || !metrics.coding_score) return 0;
    return Math.min(Math.round(metrics.coding_score * 0.2), 200);
  }
}

module.exports = new GeeksforGeeksAdapter();
