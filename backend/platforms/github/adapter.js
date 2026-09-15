/**
 * SSIET CSE Department - GitHub Platform Adapter
 * Fetches real public user details & repository aggregates via GitHub REST API.
 */

const { BasePlatformAdapter } = require('../baseAdapter');
const { SCORING_CONFIG } = require('../../config/scoringConfig');

class GitHubAdapter extends BasePlatformAdapter {
  constructor(config = {}) {
    super('github', config);
    this.apiBase = 'https://api.github.com';
  }

  async fetchProfile(username) {
    const check = this.validateUsername(username);
    if (!check.isValid) {
      return { success: false, error: check.reason, errorCategory: 'INVALID_INPUT' };
    }

    try {
      const res = await this.safeFetch(`${this.apiBase}/users/${check.cleanUsername}`);
      if (res.status === 404) {
        return { success: false, error: 'GitHub user not found', errorCategory: 'USER_NOT_FOUND' };
      }
      if (res.status === 403) {
        return { success: false, error: 'GitHub API rate limit reached', errorCategory: 'RATE_LIMITED' };
      }
      if (!res.ok) {
        return { success: false, error: `GitHub API error: HTTP ${res.status}`, errorCategory: 'API_ERROR' };
      }

      const data = await res.json();
      return {
        success: true,
        data: {
          username: data.login,
          name: data.name || data.login,
          avatarUrl: data.avatar_url,
          bio: data.bio || '',
          profileUrl: data.html_url,
          publicRepos: data.public_repos || 0,
          followers: data.followers || 0,
          following: data.following || 0,
          publicGists: data.public_gists || 0,
          createdAt: data.created_at,
        },
      };
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        error: isTimeout ? 'GitHub request timed out' : err.message,
        errorCategory: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    }
  }

  async fetchMetrics(username) {
    const profileRes = await this.fetchProfile(username);
    if (!profileRes.success) return profileRes;

    const cleanUsername = profileRes.data.username;
    let starsReceived = 0;
    let forksReceived = 0;

    // Fetch repository details to compute stars and forks received (quality indicators)
    try {
      const repoRes = await this.safeFetch(
        `${this.apiBase}/users/${cleanUsername}/repos?per_page=100&type=owner&sort=updated`
      );
      if (repoRes.ok) {
        const repos = await repoRes.json();
        if (Array.isArray(repos)) {
          for (const r of repos) {
            if (!r.fork) {
              starsReceived += (r.stargazers_count || 0);
              forksReceived += (r.forks_count || 0);
            }
          }
        }
      }
    } catch (repoErr) {
      // Non-fatal: if repo detail call times out, keep user profile counts
      console.warn(`[GitHubAdapter] Could not aggregate repo stars for ${cleanUsername}:`, repoErr.message);
    }

    const rawMetrics = {
      ...profileRes.data,
      starsReceived,
      forksReceived,
      fetchedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: rawMetrics,
    };
  }

  normalizeMetrics(rawMetrics) {
    const cfg = SCORING_CONFIG.platforms.github;
    const repos = Number(rawMetrics?.publicRepos || rawMetrics?.public_repos || 0);
    const stars = Number(rawMetrics?.starsReceived || rawMetrics?.total_stars || 0);
    const forks = Number(rawMetrics?.forksReceived || rawMetrics?.total_forks || 0);
    const followers = Number(rawMetrics?.followers || 0);
    const gists = Number(rawMetrics?.publicGists || rawMetrics?.public_gists || 0);

    const repoPts = Math.min(repos * cfg.points_per_public_repo, cfg.max_repo_points);
    const starPts = Math.min(stars * cfg.points_per_star_received, cfg.max_star_points);
    const forkPts = Math.min(forks * cfg.points_per_fork_received, cfg.max_fork_points);
    const followerPts = Math.min(followers * cfg.points_per_follower, cfg.max_follower_points);
    const gistPts = Math.min(gists * cfg.points_per_public_gist, cfg.max_gist_points);
    const basePts = repos > 0 ? cfg.base_active_profile_points : 0;

    const totalRawScore = basePts + repoPts + starPts + forkPts + followerPts + gistPts;
    const normalizedScore = Math.min(totalRawScore, cfg.max_points);

    return {
      platform: 'github',
      category: cfg.category,
      raw_score: totalRawScore,
      score: Math.round(normalizedScore),
      metrics: {
        public_repos: repos,
        total_stars: stars,
        stars_received: stars,
        total_forks: forks,
        forks_received: forks,
        followers: followers,
        public_gists: gists,
      },
      breakdown: {
        base_active: basePts,
        repositories: Math.round(repoPts),
        stars: Math.round(starPts),
        forks: Math.round(forkPts),
        followers: Math.round(followerPts),
        gists: Math.round(gistPts),
      },
      confidence: 'high',
      verification_level: 'verified_public_api',
      fetched_at: rawMetrics?.fetchedAt || new Date().toISOString(),
    };
  }
}

module.exports = { GitHubAdapter };
