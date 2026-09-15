const BasePlatformAdapter = require('../BasePlatformAdapter');

class CodeforcesAdapter extends BasePlatformAdapter {
  constructor() {
    super('codeforces', 'Codeforces', 'Competitive Programming', 'https://codeforces.com');
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'Codeforces handle is required.' };
    }
    const clean = username.trim();
    // Codeforces handles: 3-24 characters, letters, digits, dots, hyphens, underscores
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(clean)) {
      return { isValid: false, error: 'Invalid Codeforces handle format.' };
    }
    return { isValid: true };
  }

  async connect(username) {
    const valid = this.validateUsername(username);
    if (!valid.isValid) return { success: false, error: valid.error };

    const cleanUser = username.trim();
    try {
      const response = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cleanUser)}`, {
        signal: AbortSignal.timeout(8000),
      });

      const data = await response.json();
      if (data.status !== 'OK' || !data.result || data.result.length === 0) {
        return { success: false, error: `Codeforces handle '${cleanUser}' not found.` };
      }

      const info = data.result[0];
      return {
        success: true,
        profileUrl: `https://codeforces.com/profile/${info.handle}`,
        profileData: {
          handle: info.handle,
          rating: info.rating || 0,
          rank: info.rank || 'unrated',
          avatarUrl: info.avatar,
        },
      };
    } catch (err) {
      return { success: false, error: err.name === 'TimeoutError' ? 'Codeforces connection timed out.' : err.message };
    }
  }

  async fetchMetrics(username) {
    const cleanUser = username.trim();
    const response = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cleanUser)}`, {
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    if (data.status !== 'OK' || !data.result || data.result.length === 0) {
      throw new Error(`Codeforces handle '${cleanUser}' not found.`);
    }

    const info = data.result[0];

    // Optional: fetch problem submission count
    let problemsSolved = 0;
    try {
      const statusRes = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(cleanUser)}&from=1&count=100`, {
        signal: AbortSignal.timeout(6000),
      });
      const statusData = await statusRes.json();
      if (statusData.status === 'OK' && Array.isArray(statusData.result)) {
        const uniqueSolved = new Set();
        statusData.result.forEach((sub) => {
          if (sub.verdict === 'OK' && sub.problem) {
            uniqueSolved.add(`${sub.problem.contestId}-${sub.problem.index}`);
          }
        });
        problemsSolved = uniqueSolved.size;
      }
    } catch (_) {
      // Non-critical fallback
    }

    return {
      rating: info.rating || 0,
      max_rating: info.maxRating || 0,
      rank: info.rank || 'unrated',
      max_rank: info.maxRank || 'unrated',
      contribution: info.contribution || 0,
      problems_solved: problemsSolved,
    };
  }

  validateMetrics(rawMetrics) {
    if (!rawMetrics || typeof rawMetrics !== 'object') return false;
    return typeof rawMetrics.rating === 'number';
  }

  normalizeMetrics(rawMetrics) {
    const rating = rawMetrics.rating || 0;
    const maxRating = rawMetrics.max_rating || 0;
    const rank = rawMetrics.rank || 'unrated';
    const maxRank = rawMetrics.max_rank || 'unrated';
    const solved = rawMetrics.problems_solved || 0;

    return {
      category: 'competitive_programming',
      metrics: {
        rating,
        max_rating: maxRating,
        rank,
        max_rank: maxRank,
        problems_solved: solved,
      },
      displayMetrics: [
        { label: 'Current Rating', value: rating > 0 ? rating : 'Unrated' },
        { label: 'Peak Rating', value: maxRating > 0 ? maxRating : 'Unrated' },
        { label: 'Current Rank', value: rank.toUpperCase() },
        { label: 'Peak Rank', value: maxRank.toUpperCase() },
        { label: 'Verified Solutions', value: solved },
      ],
    };
  }

  calculatePlatformScore(normalizedMetrics) {
    const { metrics } = normalizedMetrics || {};
    if (!metrics) return 0;

    // Rating contribution (1200 rating -> ~240 pts; 1600 rating -> ~350 pts)
    const rating = metrics.rating || 0;
    let ratingScore = 0;
    if (rating > 0) {
      ratingScore = Math.min(Math.round(rating * 0.22), 400);
    }

    const solvedScore = Math.min((metrics.problems_solved || 0) * 3, 100);

    return Math.round(ratingScore + solvedScore);
  }
}

module.exports = new CodeforcesAdapter();
