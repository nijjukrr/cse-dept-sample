const BasePlatformAdapter = require('../BasePlatformAdapter');

class KaggleAdapter extends BasePlatformAdapter {
  constructor() {
    super('kaggle', 'Kaggle', 'Data Science & AI', 'https://kaggle.com');
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'Kaggle username is required.' };
    }
    const clean = username.trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      return { isValid: false, error: 'Invalid Kaggle username format.' };
    }
    return { isValid: true };
  }

  async connect(username) {
    const valid = this.validateUsername(username);
    if (!valid.isValid) return { success: false, error: valid.error };

    const cleanUser = username.trim();
    return {
      success: true,
      profileUrl: `https://kaggle.com/${cleanUser}`,
      profileData: {
        username: cleanUser,
        status: 'Handle Verified',
      },
    };
  }

  async fetchMetrics(username) {
    return {
      integration_status: 'handle_linked',
      note: 'Kaggle public API integration pending token setup. Profile handle verified.',
      competitions: 0,
      datasets: 0,
      notebooks: 0,
      medals: 0,
    };
  }

  validateMetrics(rawMetrics) {
    return Boolean(rawMetrics && typeof rawMetrics === 'object');
  }

  normalizeMetrics(rawMetrics) {
    return {
      category: 'data_science',
      status: rawMetrics.integration_status || 'connected',
      metrics: {
        competitions: rawMetrics.competitions || 0,
        datasets: rawMetrics.datasets || 0,
        notebooks: rawMetrics.notebooks || 0,
        medals: rawMetrics.medals || 0,
      },
      displayMetrics: [
        { label: 'Integration Status', value: 'Handle Linked (Direct API Pending)' },
        { label: 'Competitions', value: rawMetrics.competitions || 'Sync Pending' },
      ],
    };
  }

  calculatePlatformScore(normalizedMetrics) {
    const { metrics } = normalizedMetrics || {};
    if (!metrics) return 0;
    const compScore = (metrics.competitions || 0) * 15;
    const medalScore = (metrics.medals || 0) * 25;
    return Math.min(compScore + medalScore, 200);
  }
}

module.exports = new KaggleAdapter();
