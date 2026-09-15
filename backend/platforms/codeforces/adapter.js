/**
 * SSIET CSE Department - Codeforces Platform Adapter
 * Fetches real competitive rating, rank, and statistics via Codeforces official REST API.
 */

const { BasePlatformAdapter } = require('../baseAdapter');
const { SCORING_CONFIG } = require('../../config/scoringConfig');

class CodeforcesAdapter extends BasePlatformAdapter {
  constructor(config = {}) {
    super('codeforces', config);
    this.apiBase = 'https://codeforces.com/api';
  }

  async fetchProfile(username) {
    const check = this.validateUsername(username);
    if (!check.isValid) {
      return { success: false, error: check.reason, errorCategory: 'INVALID_INPUT' };
    }

    try {
      const res = await this.safeFetch(`${this.apiBase}/user.info?handles=${check.cleanUsername}`);
      if (!res.ok) {
        return { success: false, error: `Codeforces API error: HTTP ${res.status}`, errorCategory: 'API_ERROR' };
      }

      const body = await res.json();
      if (body.status !== 'OK' || !body.result || !body.result.length) {
        return { success: false, error: 'Codeforces user not found', errorCategory: 'USER_NOT_FOUND' };
      }

      const u = body.result[0];

      // Try fetching problem solving count from recent submissions
      let solvedCount = 0;
      try {
        const subRes = await this.safeFetch(`${this.apiBase}/user.status?handle=${check.cleanUsername}&from=1&count=100`);
        if (subRes.ok) {
          const subBody = await subRes.json();
          if (subBody.status === 'OK' && Array.isArray(subBody.result)) {
            const uniqueProblems = new Set();
            for (const sub of subBody.result) {
              if (sub.verdict === 'OK' && sub.problem?.contestId && sub.problem?.index) {
                uniqueProblems.add(`${sub.problem.contestId}-${sub.problem.index}`);
              }
            }
            solvedCount = uniqueProblems.size;
          }
        }
      } catch (subErr) {
        console.warn(`[CodeforcesAdapter] Status query skipped for ${check.cleanUsername}:`, subErr.message);
      }

      return {
        success: true,
        data: {
          username: u.handle,
          profileUrl: `https://codeforces.com/profile/${u.handle}`,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          rating: u.rating || 0,
          maxRating: u.maxRating || 0,
          rank: u.rank || 'unrated',
          maxRank: u.maxRank || 'unrated',
          contribution: u.contribution || 0,
          avatarUrl: u.titlePhoto || u.avatar || '',
          problemsSolved: solvedCount,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        error: isTimeout ? 'Codeforces request timed out' : err.message,
        errorCategory: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    }
  }

  async fetchMetrics(username) {
    return this.fetchProfile(username);
  }

  normalizeMetrics(rawMetrics) {
    const cfg = SCORING_CONFIG.platforms.codeforces;
    const rating = Number(rawMetrics?.rating || 0);
    const maxRating = Number(rawMetrics?.maxRating || rating);
    const solved = Number(rawMetrics?.problemsSolved || 0);

    let ratingPts = 0;
    if (rating > cfg.rating_baseline) {
      ratingPts += (rating - cfg.rating_baseline) * cfg.rating_multiplier;
    }
    // Bonus for peak rating performance
    if (maxRating > rating) {
      ratingPts += (maxRating - rating) * (cfg.max_rating_bonus_multiplier || 0.2);
    }
    ratingPts = Math.min(ratingPts, cfg.max_rating_points || 700);

    const solvedPts = Math.min(solved * cfg.points_per_problem_solved, cfg.max_solved_points);
    const totalRawScore = ratingPts + solvedPts;
    const normalizedScore = Math.min(totalRawScore, cfg.max_points);

    return {
      platform: 'codeforces',
      category: cfg.category,
      raw_score: totalRawScore,
      score: Math.round(normalizedScore),
      metrics: {
        rating,
        max_rating: maxRating,
        rank: rawMetrics?.rank || 'unrated',
        problems_solved: solved,
      },
      breakdown: {
        rating_points: Math.round(ratingPts),
        problem_points: Math.round(solvedPts),
      },
      confidence: 'high',
      verification_level: 'verified_public_api',
      fetched_at: rawMetrics?.fetchedAt || new Date().toISOString(),
    };
  }
}

module.exports = { CodeforcesAdapter };
