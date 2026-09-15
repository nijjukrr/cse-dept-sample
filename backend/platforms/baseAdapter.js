/**
 * SSIET CSE Department - Base Platform Adapter
 * Defines the standard contract for all competitive and developer platform integrations.
 */

class BasePlatformAdapter {
  constructor(platformCode, config = {}) {
    this.platformCode = platformCode;
    this.config = config;
    this.timeoutMs = config.timeoutMs || 8000;
  }

  getPlatformCode() {
    return this.platformCode;
  }

  /**
   * Validates username format before making external requests
   * Prevents injection, invalid characters, or empty strings.
   */
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, reason: 'Username is required and must be a string' };
    }
    const clean = username.trim();
    const minLen = (this.platformCode === 'leetcode' || this.platformCode === 'codeforces') ? 3 : 1;
    if (clean.length < minLen || clean.length > 50) {
      return { isValid: false, reason: `Username must be between ${minLen} and 50 characters` };
    }
    if (this.platformCode === 'github') {
      if (clean.startsWith('-') || clean.endsWith('-')) {
        return { isValid: false, reason: 'GitHub username cannot begin or end with a hyphen' };
      }
    }
    const validRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!validRegex.test(clean)) {
      return { isValid: false, reason: 'Username contains invalid characters' };
    }
    return { isValid: true, cleanUsername: clean };
  }

  getFreshness(timestamp) {
    if (!timestamp) return 'never';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) return 'fresh';
    return 'stale';
  }

  calculatePlatformScore(normalized) {
    if (!normalized) return 0;
    if (typeof normalized.calculatedScore === 'number') return normalized.calculatedScore;
    return normalized.score || 0;
  }

  /**
   * Helper fetch with strict timeout, browser User-Agent, and retry handling
   */
  async safeFetch(url, options = {}, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            ...(options.headers || {}),
          },
        });
        return response;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  /**
   * Must be implemented by subclasses
   */
  async fetchProfile(username) {
    throw new Error(`fetchProfile not implemented for ${this.platformCode}`);
  }

  async fetchMetrics(username) {
    throw new Error(`fetchMetrics not implemented for ${this.platformCode}`);
  }

  validateMetrics(rawMetrics) {
    if (!rawMetrics || typeof rawMetrics !== 'object') {
      return { isValid: false, reason: 'Raw metrics must be an object' };
    }
    return { isValid: true };
  }

  normalizeMetrics(rawMetrics) {
    throw new Error(`normalizeMetrics not implemented for ${this.platformCode}`);
  }

  getLeaderboardMetrics(normalizedMetrics) {
    return normalizedMetrics || {};
  }
}

module.exports = { BasePlatformAdapter };
