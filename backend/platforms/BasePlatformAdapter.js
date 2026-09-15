/**
 * BasePlatformAdapter
 * Abstract contract for all external competitive and developer platform adapters.
 */

class BasePlatformAdapter {
  constructor(code, name, category, baseUrl) {
    this.code = code;
    this.name = name;
    this.category = category;
    this.baseUrl = baseUrl;
  }

  /**
   * Validates username format before attempting network requests
   * @param {string} username
   * @returns {{ isValid: boolean, error?: string }}
   */
  validateUsername(username) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      return { isValid: false, error: 'Username is required.' };
    }
    return { isValid: true };
  }

  /**
   * Connects and verifies that user exists on platform
   * @param {string} username
   * @returns {Promise<{ success: boolean, profileUrl: string, profileData?: any, error?: string }>}
   */
  async connect(username) {
    throw new Error(`connect() not implemented for ${this.code}`);
  }

  /**
   * Fetches raw metrics from external platform
   * @param {string} username
   * @returns {Promise<any>}
   */
  async fetchMetrics(username) {
    throw new Error(`fetchMetrics() not implemented for ${this.code}`);
  }

  /**
   * Validates structure of raw metrics
   * @param {any} rawMetrics
   * @returns {boolean}
   */
  validateMetrics(rawMetrics) {
    return Boolean(rawMetrics && typeof rawMetrics === 'object');
  }

  /**
   * Normalizes raw metrics into common category scores & values
   * @param {any} rawMetrics
   * @returns {Object} normalizedMetrics
   */
  normalizeMetrics(rawMetrics) {
    throw new Error(`normalizeMetrics() not implemented for ${this.code}`);
  }

  /**
   * Computes platform contribution score from normalized metrics
   * @param {Object} normalizedMetrics
   * @returns {number} score
   */
  calculatePlatformScore(normalizedMetrics) {
    return 0;
  }

  /**
   * Determines freshness state based on last sync timestamp
   * @param {string|Date} lastSyncedAt
   * @returns {'fresh' | 'stale' | 'expired' | 'never'}
   */
  getFreshness(lastSyncedAt) {
    if (!lastSyncedAt) return 'never';
    const ageMs = Date.now() - new Date(lastSyncedAt).getTime();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    if (ageMs < 6 * oneHour) return 'fresh';
    if (ageMs < 7 * oneDay) return 'stale';
    return 'expired';
  }
}

module.exports = BasePlatformAdapter;
