/**
 * SSIET CSE Department - LeetCode Platform Adapter
 * Fetches real public user details & problem solving statistics via LeetCode GraphQL API.
 */

const { BasePlatformAdapter } = require('../baseAdapter');
const { SCORING_CONFIG } = require('../../config/scoringConfig');

class LeetCodeAdapter extends BasePlatformAdapter {
  constructor(config = {}) {
    super('leetcode', config);
    this.graphqlEndpoint = 'https://leetcode.com/graphql';
  }

  async fetchProfile(username) {
    const check = this.validateUsername(username);
    if (!check.isValid) {
      return { success: false, error: check.reason, errorCategory: 'INVALID_INPUT' };
    }

    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            ranking
            userAvatar
            realName
            aboutMe
          }
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          topPercentage
        }
      }
    `;

    try {
      const res = await this.safeFetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify({
          query,
          variables: { username: check.cleanUsername },
        }),
      });

      if (!res.ok) {
        return { success: false, error: `LeetCode API error: HTTP ${res.status}`, errorCategory: 'API_ERROR' };
      }

      const body = await res.json();
      if (body.errors && body.errors.length > 0) {
        return { success: false, error: body.errors[0].message, errorCategory: 'API_ERROR' };
      }

      const matchedUser = body.data?.matchedUser;
      if (!matchedUser) {
        return { success: false, error: 'LeetCode user not found', errorCategory: 'USER_NOT_FOUND' };
      }

      const submissionStats = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
      const contestData = body.data?.userContestRanking || {};

      let totalSolved = 0;
      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;

      for (const item of submissionStats) {
        if (item.difficulty === 'All') totalSolved = item.count;
        else if (item.difficulty === 'Easy') easySolved = item.count;
        else if (item.difficulty === 'Medium') mediumSolved = item.count;
        else if (item.difficulty === 'Hard') hardSolved = item.count;
      }

      return {
        success: true,
        data: {
          username: matchedUser.username,
          profileUrl: `https://leetcode.com/${matchedUser.username}`,
          ranking: matchedUser.profile?.ranking || 0,
          avatarUrl: matchedUser.profile?.userAvatar || '',
          aboutMe: matchedUser.profile?.aboutMe || '',
          totalSolved,
          easySolved,
          mediumSolved,
          hardSolved,
          contestRating: Math.round(contestData.rating || 0),
          contestsAttended: contestData.attendedContestsCount || 0,
          contestGlobalRanking: contestData.globalRanking || 0,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        error: isTimeout ? 'LeetCode request timed out' : err.message,
        errorCategory: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    }
  }

  async fetchMetrics(username) {
    return this.fetchProfile(username);
  }

  normalizeMetrics(rawMetrics) {
    const cfg = SCORING_CONFIG.platforms.leetcode;
    const easy = Number(rawMetrics?.easySolved || rawMetrics?.easy_solved || 0);
    const medium = Number(rawMetrics?.mediumSolved || rawMetrics?.medium_solved || 0);
    const hard = Number(rawMetrics?.hardSolved || rawMetrics?.hard_solved || 0);
    const total = Number(rawMetrics?.totalSolved || rawMetrics?.total_solved || (easy + medium + hard));
    const contestRating = Number(rawMetrics?.contestRating || rawMetrics?.contest_rating || 0);
    const contests = Number(rawMetrics?.contestsAttended || rawMetrics?.contests_attended || 0);
    const ranking = Number(rawMetrics?.ranking || 0);

    const easyPts = easy * cfg.points_per_easy;
    const mediumPts = medium * cfg.points_per_medium;
    const hardPts = hard * cfg.points_per_hard;
    const solvedPoints = easyPts + mediumPts + hardPts;

    // Contest rating contribution (only points above baseline)
    let contestPts = 0;
    if (contestRating > cfg.rating_baseline) {
      contestPts += (contestRating - cfg.rating_baseline) * cfg.rating_multiplier;
    }
    contestPts += Math.min(contests * cfg.contest_participation_bonus, 50);
    contestPts = Math.min(contestPts, cfg.max_contest_points);

    const totalRawScore = solvedPoints + contestPts;
    const normalizedScore = Math.min(totalRawScore, cfg.max_points);

    return {
      platform: 'leetcode',
      category: cfg.category,
      raw_score: totalRawScore,
      score: Math.round(normalizedScore),
      metrics: {
        total_solved: total,
        easy_solved: easy,
        medium_solved: medium,
        hard_solved: hard,
        contest_rating: contestRating,
        contests_attended: contests,
        ranking,
      },
      breakdown: {
        easy_points: Math.round(easyPts),
        medium_points: Math.round(mediumPts),
        hard_points: Math.round(hardPts),
        contest_points: Math.round(contestPts),
      },
      confidence: 'high',
      verification_level: 'verified_public_api',
      fetched_at: rawMetrics?.fetchedAt || new Date().toISOString(),
    };
  }

  calculatePlatformScore(norm) {
    if (!norm?.metrics) return norm?.score || 0;
    const easy = norm.metrics.easy_solved || 0;
    const medium = norm.metrics.medium_solved || 0;
    const hard = norm.metrics.hard_solved || 0;
    const ranking = norm.metrics.ranking || 0;

    const easyPts = Math.min(easy * 1, 100);
    const mediumPts = Math.min(medium * 3, 240);
    const hardPts = hard * 7;
    const rankBonus = ranking > 0 && ranking <= 50000 ? 30 : 0;

    return easyPts + mediumPts + hardPts + rankBonus;
  }
}

module.exports = { LeetCodeAdapter };
