/**
 * SSIET CSE Department - Platform Synchronization Service
 * Coordinates sync jobs, enforces rate limits and cooldowns, isolates platform failures,
 * and triggers deterministic score recomputation.
 */

const { getAdapter } = require('../platforms');
const { platformStore } = require('./platformStore');
const { scoringEngine } = require('./scoringEngine');
const { SCORING_CONFIG } = require('../config/scoringConfig');
const { supabase } = require('../db/supabase');

class SyncService {
  /**
   * Check if a manual sync is on cooldown to prevent API spamming
   */
  isSyncOnCooldown(lastSyncedAt) {
    if (!lastSyncedAt) return { onCooldown: false };
    const diffMs = Date.now() - new Date(lastSyncedAt).getTime();
    const cooldownMs = SCORING_CONFIG.freshness.cooldown_minutes_manual_sync * 60 * 1000;
    if (diffMs < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - diffMs) / 1000);
      return { onCooldown: true, remainingSeconds };
    }
    return { onCooldown: false };
  }

  /**
   * Synchronizes a single platform for a student
   */
  async syncStudentPlatform(userId, platformCode, force = false) {
    const startTime = Date.now();
    const adapter = getAdapter(platformCode);

    if (!adapter) {
      return { success: false, error: `Unsupported platform: ${platformCode}` };
    }

    // 1. Get current connection
    const connections = await platformStore.getStudentConnections(userId);
    const conn = connections.find((c) => c.platform_code === platformCode);

    if (!conn) {
      return { success: false, error: `Platform ${platformCode} is not connected for this user` };
    }

    // 2. Cooldown check
    if (!force) {
      const cooldown = this.isSyncOnCooldown(conn.last_synced_at);
      if (cooldown.onCooldown) {
        return {
          success: false,
          error: `Please wait ${cooldown.remainingSeconds}s before refreshing ${platformCode} again`,
          isCooldown: true,
          remainingSeconds: cooldown.remainingSeconds,
        };
      }
    }

    // 3. Mark connection as syncing
    await platformStore.upsertStudentConnection({
      ...conn,
      sync_status: 'syncing',
      last_attempted_at: new Date().toISOString(),
    });

    try {
      // 4. Fetch metrics via adapter
      const fetchResult = await adapter.fetchMetrics(conn.username);
      const durationMs = Date.now() - startTime;

      if (!fetchResult.success) {
        // External failure isolated!
        // DO NOT overwrite existing metrics. Retain last verified snapshot.
        console.warn(`[SyncService] Sync failed for ${conn.username} on ${platformCode}:`, fetchResult.error);

        await platformStore.upsertStudentConnection({
          ...conn,
          sync_status: 'failed',
          error_message: fetchResult.error,
          last_attempted_at: new Date().toISOString(),
        });

        await platformStore.logSyncAudit({
          user_id: userId,
          platform_code: platformCode,
          status: 'failed',
          error_category: fetchResult.errorCategory || 'UNKNOWN_ERROR',
          duration_ms: durationMs,
        });

        return {
          success: false,
          error: fetchResult.error,
          errorCategory: fetchResult.errorCategory,
          retainedPrevious: Boolean(conn.raw_metrics && Object.keys(conn.raw_metrics).length > 0),
        };
      }

      // Account Takeover / Handle Change Prevention
      const fetchedUsername = fetchResult.data.username;
      let currentOwnershipStatus = conn.ownership_status || 'unverified';
      
      if (fetchedUsername && fetchedUsername.toLowerCase() !== conn.username.toLowerCase()) {
        console.warn(`[SyncService] Handle mismatch detected for ${conn.username} vs ${fetchedUsername}. Invalidating ownership.`);
        currentOwnershipStatus = 'invalidated';
      }

      // 5. Normalize metrics
      const rawMetrics = fetchResult.data;
      const normalizedMetrics = adapter.normalizeMetrics(rawMetrics);

      // 6. Save verified snapshot
      const updatedConn = await platformStore.upsertStudentConnection({
        ...conn,
        sync_status: 'success',
        error_message: null,
        raw_metrics: rawMetrics,
        normalized_metrics: normalizedMetrics,
        platform_score: normalizedMetrics.score || 0,
        verification_level: normalizedMetrics.verification_level || conn.verification_level,
        ownership_status: currentOwnershipStatus,
        last_synced_at: new Date().toISOString(),
        last_attempted_at: new Date().toISOString(),
      });

      // 7. Audit log
      await platformStore.logSyncAudit({
        user_id: userId,
        platform_code: platformCode,
        status: 'success',
        duration_ms: durationMs,
      });

      // 8. Recompute student's overall competitive profile & rank
      await this.recalculateStudentProfile(userId);

      return {
        success: true,
        connection: updatedConn,
        normalizedMetrics,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      console.error(`[SyncService] Unexpected error syncing ${platformCode}:`, err);

      await platformStore.upsertStudentConnection({
        ...conn,
        sync_status: 'failed',
        error_message: err.message,
        last_attempted_at: new Date().toISOString(),
      });

      await platformStore.logSyncAudit({
        user_id: userId,
        platform_code: platformCode,
        status: 'error',
        error_category: 'EXCEPTION',
        duration_ms: durationMs,
      });

      return { success: false, error: err.message };
    }
  }

  /**
   * Recomputes a student's competitive score using all current connections + college achievements
   */
  async recalculateStudentProfile(userId) {
    // 1. Fetch student identity
    const { data: student } = await supabase
      .from('students')
      .select('user_id, name, roll_no, class, batch, year, avatar_url, github, linkedin')
      .eq('user_id', userId)
      .maybeSingle();

    const studentIdentity = student || { user_id: userId };

    // 2. Fetch all student platform connections
    const connections = await platformStore.getStudentConnections(userId);

    // 3. Fetch college verified achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('verified', true);

    // 4. Pure calculation
    const profile = scoringEngine.calculateStudentScore(
      studentIdentity,
      connections,
      achievements || []
    );

    // 5. Persist snapshot & update ranks safely
    try {
      await platformStore.upsertCompetitiveProfile(profile);
      await this.updateAllDepartmentRanks();
    } catch (profileErr) {
      console.warn('[SyncService] Non-fatal profile persistence error:', profileErr.message);
    }

    return profile;
  }

  /**
   * Update department rankings deterministically across all students
   */
  async updateAllDepartmentRanks() {
    const profiles = await platformStore.getAllCompetitiveProfiles();
    if (!profiles || !profiles.length) return;

    // Sort deterministically using scoringEngine tie-breaking
    profiles.sort((a, b) => scoringEngine.compareStudents(a, b));

    for (let i = 0; i < profiles.length; i++) {
      const rank = i + 1;
      if (profiles[i].department_rank !== rank) {
        profiles[i].department_rank = rank;
        await platformStore.upsertCompetitiveProfile(profiles[i]);
      }
    }
  }
}

const syncService = new SyncService();

module.exports = {
  SyncService,
  syncService,
};
