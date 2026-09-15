/**
 * SSIET CSE Department - Platform Integration Routes
 * Manages external developer & competitive programming accounts, synchronization,
 * and verification.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAllPlatforms, getPlatformMeta, getAdapter } = require('../platforms');
const { platformStore } = require('../services/platformStore');
const { syncService } = require('../services/syncService');
const { normalizationEngine } = require('../services/normalizationEngine');

// ─── GET /api/platforms ───────────────────────────────────────────────────────
// Returns all supported platform definitions and metadata
router.get('/', (req, res) => {
  res.json(getAllPlatforms());
});

// ─── GET /api/platforms/meta/:platformCode ────────────────────────────────────
router.get('/meta/:platformCode', (req, res) => {
  const meta = getPlatformMeta(req.params.platformCode);
  if (!meta) return res.status(404).json({ error: 'Platform not found' });
  res.json(meta);
});

// ─── GET /api/platforms/student/:userId and /api/platforms/users/:userId ─────
async function handleGetStudentPlatforms(req, res) {
  try {
    const userId = req.params.userId;
    const [connections, compProfile] = await Promise.all([
      platformStore.getStudentConnections(userId),
      platformStore.getCompetitiveProfile(userId),
    ]);

    const result = connections.map((conn) => {
      const meta = getPlatformMeta(conn.platform_code) || {};
      const freshness = normalizationEngine.getFreshnessStatus(conn.last_synced_at);
      return {
        ...conn,
        platform_name: meta.name || conn.platform_code,
        brand_color: meta.brandColor,
        accent_color: meta.accentColor,
        category: meta.category,
        category_label: meta.categoryLabel,
        freshness,
      };
    });

    // Support both direct array format and { platforms, competitive_profile } shape
    if (req.path.startsWith('/users/')) {
      return res.json({
        platforms: result,
        competitive_profile: compProfile,
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching student connections:', err);
    res.status(500).json({ error: 'Failed to fetch student platforms' });
  }
}

router.get('/student/:userId', handleGetStudentPlatforms);
router.get('/users/:userId', handleGetStudentPlatforms);

// ─── POST /api/platforms/users/:userId/:platformCode/sync ─────────────────────
router.post('/users/:userId/:platformCode/sync', authMiddleware, async (req, res) => {
  const targetId = req.params.userId;
  if (req.user.id !== targetId && req.user.role === 'student') {
    return res.status(403).json({ error: "Cannot sync another user's platform" });
  }
  const result = await syncService.syncStudentPlatform(targetId, req.params.platformCode);
  if (!result.success) {
    if (result.isCooldown) {
      return res.status(429).json({ error: result.error, remainingSeconds: result.remainingSeconds });
    }
    return res.status(400).json({ error: result.error });
  }
  res.json({ message: 'Synchronized successfully', connection: result.connection });
});

// ─── DELETE /api/platforms/users/:userId/:platformCode ────────────────────────
router.delete('/users/:userId/:platformCode', authMiddleware, async (req, res) => {
  const targetId = req.params.userId;
  if (req.user.id !== targetId && req.user.role === 'student') {
    return res.status(403).json({ error: "Cannot disconnect another user's platform" });
  }
  await platformStore.deleteStudentConnection(targetId, req.params.platformCode);
  await syncService.recalculateStudentProfile(targetId);
  res.json({ message: 'Disconnected successfully' });
});

// ─── POST /api/platforms/connect ──────────────────────────────────────────────
// Connect an external platform handle for the authenticated student
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform_code, username } = req.body;

    if (!platform_code || !username) {
      return res.status(400).json({ error: 'platform_code and username are required' });
    }

    const meta = getPlatformMeta(platform_code);
    const adapter = getAdapter(platform_code);

    if (!meta || !adapter) {
      return res.status(400).json({ error: `Unsupported platform: ${platform_code}` });
    }

    // 1. Anti-manipulation: Validate username handle structure
    const check = adapter.validateUsername(username);
    if (!check.isValid) {
      return res.status(400).json({ error: check.reason });
    }

    const cleanUsername = check.cleanUsername;
    const profileUrl = meta.profileUrlTemplate.replace('{username}', cleanUsername);

    // 2. Create / Upsert initial connection record
    const conn = await platformStore.upsertStudentConnection({
      user_id: userId,
      platform_code,
      username: cleanUsername,
      profile_url: profileUrl,
      connection_status: 'connected',
      verification_level: meta.verificationLevel || 'public_linked',
      sync_status: 'syncing',
      raw_metrics: {},
      normalized_metrics: {},
      platform_score: 0,
    });

    // 3. Trigger initial synchronization immediately
    const syncRes = await syncService.syncStudentPlatform(userId, platform_code, true);

    res.status(201).json({
      message: `Successfully connected ${meta.name}`,
      connection: syncRes.connection || conn,
      syncResult: syncRes,
    });
  } catch (err) {
    console.error('Platform connect error:', err);
    res.status(500).json({ error: 'Failed to connect platform' });
  }
});

// ─── POST /api/platforms/sync/:platformCode ───────────────────────────────────
// Manually refresh / sync an external platform for the authenticated user
router.post('/sync/:platformCode', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const platformCode = req.params.platformCode;

    const result = await syncService.syncStudentPlatform(userId, platformCode);

    if (!result.success) {
      if (result.isCooldown) {
        return res.status(429).json({
          error: result.error,
          remainingSeconds: result.remainingSeconds,
        });
      }
      return res.status(400).json({
        error: result.error,
        retainedPrevious: result.retainedPrevious,
      });
    }

    res.json({
      message: `Synchronized ${platformCode} successfully`,
      connection: result.connection,
      normalizedMetrics: result.normalizedMetrics,
    });
  } catch (err) {
    console.error('Platform sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── DELETE /api/platforms/disconnect/:platformCode ───────────────────────────
// Disconnect an external platform
router.delete('/disconnect/:platformCode', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const platformCode = req.params.platformCode;

    await platformStore.deleteStudentConnection(userId, platformCode);
    // Recalculate profile score after disconnecting
    await syncService.recalculateStudentProfile(userId);

    res.json({ message: `Disconnected ${platformCode} successfully` });
  } catch (err) {
    console.error('Platform disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

// ─── POST /api/platforms/verify ───────────────────────────────────────────────
// Real account verification diagnostic endpoint for developers / administrators
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { platform, username } = req.body || {};
    if (!platform || !username) {
      return res.status(400).json({ error: 'Platform and username are required' });
    }
    const meta = getPlatformMeta(platform);
    const adapter = getAdapter(platform);
    if (!meta || !adapter) {
      return res.status(400).json({ error: `Platform '${platform}' is not supported` });
    }

    const val = adapter.validateUsername(username);
    if (!val.isValid) {
      return res.status(400).json({ error: val.reason });
    }

    const profileRes = await adapter.fetchProfile(val.cleanUsername);
    if (!profileRes.success) {
      return res.json({
        exists: false,
        verification_status: 'unverified',
        metrics_available: false,
        source: meta.sourceType || 'unsupported',
        error: profileRes.error,
        errorCategory: profileRes.errorCategory,
      });
    }

    const isLiveVerified = meta.integrationStatus === 'verified_live';
    res.json({
      exists: true,
      username: val.cleanUsername,
      profile_url: profileRes.data?.profileUrl || `${meta.profileUrlTemplate.replace('{username}', val.cleanUsername)}`,
      verification_status: isLiveVerified ? 'verified_public_api' : 'public_profile_linked',
      metrics_available: isLiveVerified,
      source: meta.sourceType || 'unsupported',
      integration_status: meta.integrationStatus,
      note: meta.note || '',
    });
  } catch (err) {
    console.error('Platform verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

const crypto = require('crypto');

// ─── POST /api/platforms/verify/start ─────────────────────────────────────────
// Starts the challenge-based verification process
router.post('/verify/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform_code } = req.body;
    
    if (!platform_code) {
      return res.status(400).json({ error: 'platform_code is required' });
    }

    const connections = await platformStore.getStudentConnections(userId);
    const conn = connections.find(c => c.platform_code === platform_code);
    
    if (!conn) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }

    // Generate challenge token
    const token = `SSIET-VERIFY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    conn.verification_token = token;
    conn.ownership_status = 'pending';
    conn.verification_started_at = new Date().toISOString();
    
    await platformStore.upsertStudentConnection(conn);
    
    const meta = getPlatformMeta(platform_code);
    
    // Provide hints on where to put the token based on platform
    let placementHint = 'your profile bio';
    if (platform_code === 'leetcode') placementHint = 'your "About Me" section';
    if (platform_code === 'codeforces') placementHint = 'your First Name or Last Name';
    
    res.json({
      message: 'Verification started',
      verification_token: token,
      placement_hint: placementHint,
      platform_name: meta.name
    });
  } catch (err) {
    console.error('Verify start error:', err);
    res.status(500).json({ error: 'Failed to start verification process' });
  }
});

// ─── POST /api/platforms/verify/confirm ───────────────────────────────────────
// Confirms the challenge-based verification process
router.post('/verify/confirm', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform_code } = req.body;
    
    if (!platform_code) {
      return res.status(400).json({ error: 'platform_code is required' });
    }

    const connections = await platformStore.getStudentConnections(userId);
    const conn = connections.find(c => c.platform_code === platform_code);
    
    if (!conn) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }

    if (conn.ownership_status !== 'pending' || !conn.verification_token) {
      return res.status(400).json({ error: 'No active verification process for this platform' });
    }

    const adapter = getAdapter(platform_code);
    if (!adapter) {
      return res.status(400).json({ error: `Unsupported platform: ${platform_code}` });
    }

    const profileRes = await adapter.fetchProfile(conn.username);
    
    if (!profileRes.success) {
      return res.status(400).json({ error: 'Failed to fetch platform profile to verify', details: profileRes.error });
    }

    const profileData = profileRes.data;
    const token = conn.verification_token;
    
    // Check various text fields where the user could have placed the token
    const textToSearch = [
      profileData.bio,
      profileData.aboutMe,
      profileData.firstName,
      profileData.lastName,
      profileData.name // Fallback for GitHub 'name'
    ].filter(Boolean).join(' ').toUpperCase();

    if (textToSearch.includes(token.toUpperCase())) {
      conn.ownership_status = 'verified';
      conn.verified_at = new Date().toISOString();
      conn.verification_token = null; // Clear token after success
      
      await platformStore.upsertStudentConnection(conn);
      
      return res.json({
        message: 'Account ownership verified successfully',
        ownership_status: 'verified'
      });
    } else {
      return res.status(400).json({ 
        error: 'Verification token not found on profile',
        message: 'Please ensure you saved the token exactly as shown in the specified field.'
      });
    }
    
  } catch (err) {
    console.error('Verify confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm verification process' });
  }
});

module.exports = router;
