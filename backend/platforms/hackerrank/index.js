const BasePlatformAdapter = require('../BasePlatformAdapter');

class HackerRankAdapter extends BasePlatformAdapter {
  constructor() {
    super('hackerrank', 'HackerRank', 'Problem Solving & Skills', 'https://hackerrank.com');
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'HackerRank username is required.' };
    }
    const clean = username.trim();
    if (!/^[a-zA-Z0-9_]{2,30}$/.test(clean)) {
      return { isValid: false, error: 'Invalid HackerRank username format.' };
    }
    return { isValid: true };
  }

  async connect(username) {
    const valid = this.validateUsername(username);
    if (!valid.isValid) return { success: false, error: valid.error };

    const cleanUser = username.trim();
    try {
      const res = await fetch(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(cleanUser)}/badges`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SSIET-CSE-Platform' },
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 404) {
        return { success: false, error: `HackerRank profile '${cleanUser}' not found.` };
      }
      if (!res.ok) {
        return { success: false, error: `HackerRank service error (HTTP ${res.status}).` };
      }

      const data = await res.json();
      return {
        success: true,
        profileUrl: `https://www.hackerrank.com/profile/${cleanUser}`,
        profileData: {
          username: cleanUser,
          badgeCount: Array.isArray(data?.models) ? data.models.length : 0,
        },
      };
    } catch (err) {
      return { success: false, error: err.name === 'TimeoutError' ? 'HackerRank connection timed out.' : err.message };
    }
  }

  async fetchMetrics(username) {
    const cleanUser = username.trim();
    const res = await fetch(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(cleanUser)}/badges`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SSIET-CSE-Platform' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch HackerRank badges for '${cleanUser}'`);
    }

    const data = await res.json();
    const badges = Array.isArray(data?.models) ? data.models : [];

    let totalStars = 0;
    let badgeList = [];

    for (const b of badges) {
      const stars = b.stars || 0;
      totalStars += stars;
      badgeList.push({
        name: b.badge_name,
        stars: stars,
      });
    }

    return {
      badges_count: badges.length,
      total_stars: totalStars,
      badge_details: badgeList,
    };
  }

  validateMetrics(rawMetrics) {
    if (!rawMetrics || typeof rawMetrics !== 'object') return false;
    return typeof rawMetrics.badges_count === 'number' && typeof rawMetrics.total_stars === 'number';
  }

  normalizeMetrics(rawMetrics) {
    const badgeCount = rawMetrics.badges_count || 0;
    const stars = rawMetrics.total_stars || 0;

    return {
      category: 'certifications',
      metrics: {
        badges_count: badgeCount,
        total_stars: stars,
      },
      displayMetrics: [
        { label: 'Skill Badges Earned', value: badgeCount },
        { label: 'Total Stars Collected', value: stars },
      ],
    };
  }

  calculatePlatformScore(normalizedMetrics) {
    const { metrics } = normalizedMetrics || {};
    if (!metrics) return 0;

    const badgeScore = Math.min((metrics.badges_count || 0) * 12, 120);
    const starScore = Math.min((metrics.total_stars || 0) * 6, 90);

    return Math.round(badgeScore + starScore);
  }
}

module.exports = new HackerRankAdapter();
