/**
 * Competitive Platform UI Helpers
 * Utility functions for rendering, formatting, and verifying competitive platform stats
 */

export function getFreshnessStatus(lastSyncAt, staleThresholdMs = 24 * 60 * 60 * 1000) {
  if (!lastSyncAt) return { status: 'never', label: 'Never Synced', variant: 'muted' };
  
  const diff = Date.now() - new Date(lastSyncAt).getTime();
  if (diff < 60 * 60 * 1000) {
    const mins = Math.max(1, Math.round(diff / 60000));
    return { status: 'fresh', label: `Updated ${mins}m ago`, variant: 'success' };
  }
  if (diff < staleThresholdMs) {
    const hours = Math.round(diff / 3600000);
    return { status: 'recent', label: `Updated ${hours}h ago`, variant: 'info' };
  }
  return { status: 'stale', label: 'Data Stale', variant: 'warning' };
}

export function calculateCategoryBreakdown(categories = {}) {
  const total = Object.values(categories).reduce((acc, val) => acc + (Number(val) || 0), 0);
  if (total === 0) return [];

  return Object.entries(categories).map(([key, score]) => ({
    key,
    score: Number(score) || 0,
    percentage: Math.round(((Number(score) || 0) / total) * 100),
  }));
}

export function sanitizePlatformUsername(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return '';
  let clean = rawInput.trim();
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');
  // Extract handle if full URL was pasted
  if (clean.includes('github.com/')) clean = clean.split('github.com/').pop();
  else if (clean.includes('leetcode.com/')) clean = clean.split('leetcode.com/').pop();
  else if (clean.includes('codeforces.com/profile/')) clean = clean.split('codeforces.com/profile/').pop();
  else if (clean.includes('hackerrank.com/')) clean = clean.split('hackerrank.com/').pop();
  else if (clean.includes('codechef.com/users/')) clean = clean.split('codechef.com/users/').pop();
  else if (clean.includes('geeksforgeeks.org/user/')) clean = clean.split('geeksforgeeks.org/user/').pop();
  else if (clean.includes('kaggle.com/')) clean = clean.split('kaggle.com/').pop();

  return clean.replace(/[^a-zA-Z0-9_.-]/g, '');
}

export function getPlatformProfileUrl(platformCode, username) {
  if (!username) return '#';
  const urls = {
    github: `https://github.com/${username}`,
    leetcode: `https://leetcode.com/${username}`,
    codeforces: `https://codeforces.com/profile/${username}`,
    hackerrank: `https://www.hackerrank.com/${username}`,
    codechef: `https://www.codechef.com/users/${username}`,
    geeksforgeeks: `https://auth.geeksforgeeks.org/user/${username}`,
    kaggle: `https://www.kaggle.com/${username}`,
  };
  return urls[platformCode] || '#';
}

/**
 * Single Source of Truth for Frontend Platform Connection States
 * Determines badge style, labels, eligibility explanations, and CTA actions.
 */
export function resolvePlatformConnectionStatus(connection, platformMeta = {}) {
  const isPendingPlatform =
    platformMeta.integrationStatus === 'integration_pending' ||
    platformMeta.integration_status === 'integration_pending';

  if (isPendingPlatform) {
    return {
      statusKey: 'INTEGRATION_PENDING',
      badgeVariant: 'pending',
      badgeText: 'Integration Pending',
      secondaryText: 'Platform data is not currently included in competitive scoring.',
      scoreEligibilityText: 'Integration pending — no competitive points awarded',
      pointsText: '0 points (Integration Pending)',
      ctaType: 'none',
      isVerified: false,
      isLinked: false,
    };
  }

  const isConnected = Boolean(
    connection &&
    connection.connection_status !== 'disconnected' &&
    connection.connection_status !== 'unlinked'
  );

  if (!isConnected) {
    return {
      statusKey: 'UNLINKED',
      badgeVariant: 'outline',
      badgeText: 'Unlinked',
      secondaryText: 'Connect handle to start ownership verification.',
      scoreEligibilityText: 'Not connected to your department profile',
      pointsText: '0 points (Not connected)',
      ctaType: 'connect',
      isVerified: false,
      isLinked: false,
    };
  }

  const ownershipStatus = connection.ownership_status || 'unverified';
  const syncStatus = connection.sync_status || 'never_synced';
  const isVerified = ownershipStatus === 'verified';

  if (isVerified) {
    if (syncStatus === 'failed') {
      return {
        statusKey: 'SYNC_FAILED',
        badgeVariant: 'sync_failed',
        badgeText: 'Sync Failed',
        secondaryText: connection.error_message || 'Failed to refresh latest stats. Last verified snapshot retained.',
        scoreEligibilityText: 'Eligible for leaderboard scoring (Retained last verified snapshot)',
        pointsText: `+${connection.platform_score || 0} pts`,
        ctaType: 'sync',
        isVerified: true,
        isLinked: true,
      };
    }

    return {
      statusKey: 'VERIFIED',
      badgeVariant: 'verified',
      badgeText: '✓ Verified',
      secondaryText: 'Eligible for leaderboard scoring',
      scoreEligibilityText: 'Contributes to your competitive score',
      pointsText: `+${connection.platform_score || 0} pts`,
      ctaType: 'sync',
      isVerified: true,
      isLinked: true,
    };
  }

  if (ownershipStatus === 'failed') {
    return {
      statusKey: 'VERIFICATION_FAILED',
      badgeVariant: 'verification_failed',
      badgeText: 'Verification Failed',
      secondaryText: 'Ownership token was not found on public profile.',
      scoreEligibilityText: 'Does not contribute to leaderboard score until verified',
      pointsText: '0 points because ownership is not verified',
      ctaType: 'verify',
      isVerified: false,
      isLinked: true,
    };
  }

  // Connected but unverified (e.g. 'unverified', 'pending', 'invalidated')
  return {
    statusKey: 'LINKED_UNVERIFIED',
    badgeVariant: 'linked',
    badgeText: 'Linked',
    secondaryText: 'Ownership not verified',
    scoreEligibilityText: 'Does not contribute to leaderboard score until ownership is verified',
    pointsText: '0 points because ownership is not verified',
    ctaType: 'verify',
    isVerified: false,
    isLinked: true,
  };
}

