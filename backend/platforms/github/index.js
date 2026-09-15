const BasePlatformAdapter = require('../BasePlatformAdapter');

class GitHubAdapter extends BasePlatformAdapter {
  constructor() {
    super('github', 'GitHub', 'Open Source & Projects', 'https://github.com');
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'GitHub username is required.' };
    }
    const clean = username.trim();
    // GitHub usernames: 1-39 alphanumeric characters or hyphens, cannot begin/end with hyphen
    const regex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
    if (!regex.test(clean)) {
      return { isValid: false, error: 'Invalid GitHub username format.' };
    }
    return { isValid: true };
  }

  async connect(username) {
    const valid = this.validateUsername(username);
    if (!valid.isValid) return { success: false, error: valid.error };

    const cleanUser = username.trim();
    try {
      const response = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`, {
        headers: {
          'User-Agent': 'SSIET-CSE-Platform',
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.status === 404) {
        return { success: false, error: `GitHub profile '${cleanUser}' does not exist.` };
      }
      if (!response.ok) {
        return { success: false, error: `GitHub API error (HTTP ${response.status}).` };
      }

      const data = await response.json();
      return {
        success: true,
        profileUrl: `https://github.com/${cleanUser}`,
        profileData: {
          login: data.login,
          name: data.name || data.login,
          avatarUrl: data.avatar_url,
          bio: data.bio,
        },
      };
    } catch (err) {
      return { success: false, error: err.name === 'TimeoutError' ? 'GitHub connection timed out.' : err.message };
    }
  }

  async fetchMetrics(username) {
    const cleanUser = username.trim();
    // 1. Fetch user profile
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`, {
      headers: { 'User-Agent': 'SSIET-CSE-Platform', 'Accept': 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!userRes.ok) {
      throw new Error(`Failed to fetch GitHub profile for '${cleanUser}' (HTTP ${userRes.status})`);
    }
    const userProfile = await userRes.json();

    // 2. Fetch repos to calculate stars and forks
    let repos = [];
    try {
      const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?per_page=100&type=owner`, {
        headers: { 'User-Agent': 'SSIET-CSE-Platform', 'Accept': 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(8000),
      });
      if (reposRes.ok) {
        repos = await reposRes.json();
      }
    } catch (_) {
      // Repos query failed gracefully
    }

    const totalStars = Array.isArray(repos) ? repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0) : 0;
    const totalForks = Array.isArray(repos) ? repos.reduce((sum, r) => sum + (r.forks_count || 0), 0) : 0;

    return {
      public_repos: userProfile.public_repos || 0,
      public_gists: userProfile.public_gists || 0,
      followers: userProfile.followers || 0,
      following: userProfile.following || 0,
      total_stars: totalStars,
      total_forks: totalForks,
      created_at: userProfile.created_at,
      avatar_url: userProfile.avatar_url,
      bio: userProfile.bio,
    };
  }

  validateMetrics(rawMetrics) {
    if (!rawMetrics || typeof rawMetrics !== 'object') return false;
    return typeof rawMetrics.public_repos === 'number' && typeof rawMetrics.total_stars === 'number';
  }

  normalizeMetrics(rawMetrics) {
    const repos = rawMetrics.public_repos || 0;
    const stars = rawMetrics.total_stars || 0;
    const forks = rawMetrics.total_forks || 0;
    const followers = rawMetrics.followers || 0;

    return {
      category: 'open_source',
      metrics: {
        public_repos: repos,
        total_stars: stars,
        total_forks: forks,
        followers: followers,
      },
      displayMetrics: [
        { label: 'Public Repositories', value: repos },
        { label: 'Total Stars Received', value: stars },
        { label: 'Total Forks Received', value: forks },
        { label: 'Followers', value: followers },
      ],
    };
  }

  calculatePlatformScore(normalizedMetrics) {
    const { metrics } = normalizedMetrics || {};
    if (!metrics) return 0;

    // Breadth & Impact scoring
    const repoScore = Math.min((metrics.public_repos || 0) * 4, 80);
    const starScore = Math.min((metrics.total_stars || 0) * 8, 160);
    const forkScore = Math.min((metrics.total_forks || 0) * 5, 80);
    const followerScore = Math.min((metrics.followers || 0) * 2, 40);

    return Math.round(repoScore + starScore + forkScore + followerScore);
  }
}

module.exports = new GitHubAdapter();
