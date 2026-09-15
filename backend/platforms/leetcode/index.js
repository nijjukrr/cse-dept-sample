const BasePlatformAdapter = require('../BasePlatformAdapter');

class LeetCodeAdapter extends BasePlatformAdapter {
  constructor() {
    super('leetcode', 'LeetCode', 'Problem Solving', 'https://leetcode.com');
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'LeetCode username is required.' };
    }
    const clean = username.trim();
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(clean)) {
      return { isValid: false, error: 'Invalid LeetCode username format.' };
    }
    return { isValid: true };
  }

  async queryLeetCodeGraphQL(username) {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            ranking
            reputation
          }
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
      }
    `;

    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SSIET-CSE-Platform',
      },
      body: JSON.stringify({
        query,
        variables: { username: username.trim() },
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      throw new Error(`LeetCode service returned status ${response.status}`);
    }

    return await response.json();
  }

  async connect(username) {
    const valid = this.validateUsername(username);
    if (!valid.isValid) return { success: false, error: valid.error };

    const cleanUser = username.trim();
    try {
      const data = await this.queryLeetCodeGraphQL(cleanUser);
      if (!data?.data?.matchedUser) {
        return { success: false, error: `LeetCode account '${cleanUser}' not found.` };
      }

      return {
        success: true,
        profileUrl: `https://leetcode.com/${cleanUser}`,
        profileData: {
          username: cleanUser,
          ranking: data.data.matchedUser.profile?.ranking,
        },
      };
    } catch (err) {
      return { success: false, error: err.name === 'TimeoutError' ? 'LeetCode connection timed out.' : err.message };
    }
  }

  async fetchMetrics(username) {
    const cleanUser = username.trim();
    const data = await this.queryLeetCodeGraphQL(cleanUser);
    const user = data?.data?.matchedUser;

    if (!user) {
      throw new Error(`LeetCode account '${cleanUser}' not found.`);
    }

    const submissions = user.submitStatsGlobal?.acSubmissionNum || [];
    let totalSolved = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    for (const item of submissions) {
      if (item.difficulty === 'All') totalSolved = item.count;
      else if (item.difficulty === 'Easy') easySolved = item.count;
      else if (item.difficulty === 'Medium') mediumSolved = item.count;
      else if (item.difficulty === 'Hard') hardSolved = item.count;
    }

    return {
      total_solved: totalSolved,
      easy_solved: easySolved,
      medium_solved: mediumSolved,
      hard_solved: hardSolved,
      ranking: user.profile?.ranking || 0,
      reputation: user.profile?.reputation || 0,
    };
  }

  validateMetrics(rawMetrics) {
    if (!rawMetrics || typeof rawMetrics !== 'object') return false;
    return typeof rawMetrics.total_solved === 'number' && typeof rawMetrics.easy_solved === 'number';
  }

  normalizeMetrics(rawMetrics) {
    const easy = rawMetrics.easy_solved || 0;
    const medium = rawMetrics.medium_solved || 0;
    const hard = rawMetrics.hard_solved || 0;
    const total = rawMetrics.total_solved || (easy + medium + hard);
    const rank = rawMetrics.ranking || 0;

    return {
      category: 'problem_solving',
      metrics: {
        total_solved: total,
        easy_solved: easy,
        medium_solved: medium,
        hard_solved: hard,
        ranking: rank,
      },
      displayMetrics: [
        { label: 'Total Solved', value: total },
        { label: 'Easy Solved', value: easy },
        { label: 'Medium Solved', value: medium },
        { label: 'Hard Solved', value: hard },
        { label: 'Global Ranking', value: rank > 0 ? `#${rank.toLocaleString()}` : 'Unranked' },
      ],
    };
  }

  calculatePlatformScore(normalizedMetrics) {
    const { metrics } = normalizedMetrics || {};
    if (!metrics) return 0;

    // Difficulty-weighted calculation
    const easyScore = Math.min((metrics.easy_solved || 0) * 1, 100);
    const mediumScore = Math.min((metrics.medium_solved || 0) * 3, 240);
    const hardScore = Math.min((metrics.hard_solved || 0) * 7, 350);

    // Bonus for high global standing
    let rankBonus = 0;
    const r = metrics.ranking || 0;
    if (r > 0 && r <= 10000) rankBonus = 50;
    else if (r > 0 && r <= 50000) rankBonus = 30;
    else if (r > 0 && r <= 150000) rankBonus = 15;

    return Math.round(easyScore + mediumScore + hardScore + rankBonus);
  }
}

module.exports = new LeetCodeAdapter();
