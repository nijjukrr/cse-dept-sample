import client from './client';

/**
 * Platform API Service Layer
 * Centralizes all external developer platform connection, verification, and synchronization requests.
 */

export async function getPlatforms() {
  const response = await client.get('/platforms');
  return response.data || [];
}

export async function getStudentPlatforms(userId) {
  const response = await client.get(`/platforms/users/${userId}`);
  // Normalize both response structures (array or { platforms, competitive_profile })
  if (Array.isArray(response.data)) {
    return { platforms: response.data, competitive_profile: null };
  }
  return {
    platforms: response.data.platforms || [],
    competitive_profile: response.data.competitive_profile || null,
  };
}

export async function connectPlatform(platformCode, username) {
  const response = await client.post('/platforms/connect', {
    platform_code: platformCode,
    username,
  });
  return response.data;
}

export async function disconnectPlatform(platformCode, userId) {
  const endpoint = userId
    ? `/platforms/users/${userId}/${platformCode}`
    : `/platforms/disconnect/${platformCode}`;
  const response = await client.delete(endpoint);
  return response.data;
}

export async function startPlatformVerification(platformCode) {
  const response = await client.post('/platforms/verify/start', {
    platform_code: platformCode,
  });
  return response.data;
}

export async function confirmPlatformVerification(platformCode) {
  const response = await client.post('/platforms/verify/confirm', {
    platform_code: platformCode,
  });
  return response.data;
}

export async function syncPlatform(platformCode, userId) {
  const endpoint = userId
    ? `/platforms/users/${userId}/${platformCode}/sync`
    : `/platforms/sync/${platformCode}`;
  const response = await client.post(endpoint);
  return response.data;
}

export async function getScoreBreakdown(userId) {
  const response = await client.get(`/leaderboard/breakdown/${userId}`);
  return response.data;
}
