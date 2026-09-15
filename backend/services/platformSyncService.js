const { supabase } = require('../db/supabase');
const registry = require('../platforms/registry');
const { calculateCompetitiveScore } = require('./scoringEngine');

// Minimum cooldown in ms between manual sync attempts for a given platform connection
const SYNC_COOLDOWN_MS = 60 * 1000;

class PlatformSyncService {
  /**
   * Connects a platform to a student account
   */
  async connectPlatform(userId, platformCode, rawUsername) {
    const adapter = registry.getAdapter(platformCode);
    if (!adapter) {
      throw new Error(`Platform '${platformCode}' is not supported.`);
    }

    const val = adapter.validateUsername(rawUsername);
    if (!val.isValid) {
      throw new Error(val.error);
    }

    const username = rawUsername.trim();

    // Verify account existence via platform adapter
    const connectionResult = await adapter.connect(username);
    if (!connectionResult.success) {
      throw new Error(connectionResult.error || `Unable to verify ${adapter.name} profile.`);
    }

    const profileUrl = connectionResult.profileUrl || `${adapter.baseUrl}/${username}`;

    // Upsert into student_platform_connections
    const { data: connection, error: upsertErr } = await supabase
      .from('student_platform_connections')
      .upsert(
        {
          user_id: userId,
          platform_code: platformCode.toLowerCase(),
          username,
          profile_url: profileUrl,
          connection_status: 'connected',
          verification_level: 'verified_public_api',
          sync_status: 'syncing',
          last_attempted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform_code' }
      )
      .select()
      .single();

    if (upsertErr || !connection) {
      console.error('Error saving platform connection:', upsertErr);
      throw new Error('Failed to save platform connection record.');
    }

    // Trigger initial sync in background / synchronous flow
    await this.syncPlatform(userId, platformCode.toLowerCase(), true);

    return connection;
  }

  /**
   * Synchronizes metrics for a specific connected platform
   */
  async syncPlatform(userId, platformCode, bypassCooldown = false) {
    const adapter = registry.getAdapter(platformCode);
    if (!adapter) {
      throw new Error(`Unsupported platform: ${platformCode}`);
    }

    // 1. Fetch current connection record
    const { data: conn, error: connErr } = await supabase
      .from('student_platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform_code', platformCode)
      .maybeSingle();

    if (connErr || !conn) {
      throw new Error(`No active ${adapter.name} connection found for this user.`);
    }

    // 2. Check cooldown to prevent external API hammering
    if (!bypassCooldown && conn.last_attempted_at) {
      const elapsed = Date.now() - new Date(conn.last_attempted_at).getTime();
      if (elapsed < SYNC_COOLDOWN_MS) {
        const remainingSec = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
        throw new Error(`Sync is in cooldown. Please wait ${remainingSec}s before refreshing ${adapter.name}.`);
      }
    }

    const startTime = Date.now();
    await supabase
      .from('student_platform_connections')
      .update({ last_attempted_at: new Date().toISOString(), sync_status: 'syncing' })
      .eq('id', conn.id);

    try {
      // 3. Fetch external metrics
      const rawMetrics = await adapter.fetchMetrics(conn.username);
      const normalizedMetrics = adapter.normalizeMetrics(rawMetrics);
      const platformScore = adapter.calculatePlatformScore(normalizedMetrics);

      // 4. Update connection record
      await supabase
        .from('student_platform_connections')
        .update({
          raw_metrics: rawMetrics,
          normalized_metrics: normalizedMetrics,
          platform_score: platformScore,
          sync_status: 'success',
          last_synced_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id);

      // 5. Audit log
      await supabase.from('sync_audit_logs').insert({
        user_id: userId,
        platform_code: platformCode,
        status: 'success',
        duration_ms: Date.now() - startTime,
      });

      // 6. Recalculate student overall profile score
      await this.recalculateStudentProfile(userId);

      return {
        success: true,
        platform_code: platformCode,
        score: platformScore,
        normalized_metrics: normalizedMetrics,
      };
    } catch (err) {
      console.warn(`Sync failed for ${platformCode} (${conn.username}):`, err.message);

      // CRITICAL: Retain existing verified score and raw metrics on transient failure!
      await supabase
        .from('student_platform_connections')
        .update({
          sync_status: 'failed',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id);

      await supabase.from('sync_audit_logs').insert({
        user_id: userId,
        platform_code: platformCode,
        status: 'failed',
        error_category: err.name || 'ExternalError',
        duration_ms: Date.now() - startTime,
      });

      return {
        success: false,
        platform_code: platformCode,
        error: err.message,
        retained_score: conn.platform_score,
      };
    }
  }

  /**
   * Recalculates student's competitive profile score based on all connected platforms
   */
  async recalculateStudentProfile(userId) {
    const { data: connections } = await supabase
      .from('student_platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('connection_status', 'connected');

    const scoreResult = calculateCompetitiveScore(connections || []);

    await supabase.from('student_competitive_profiles').upsert(
      {
        user_id: userId,
        overall_score: scoreResult.overall_score,
        problem_solving_score: scoreResult.problem_solving_score,
        competitive_programming_score: scoreResult.competitive_programming_score,
        open_source_score: scoreResult.open_source_score,
        certifications_score: scoreResult.certifications_score,
        community_score: scoreResult.community_score,
        category_breakdown: scoreResult.category_breakdown,
        platform_breakdown: scoreResult.platform_breakdown,
        connected_platform_count: (connections || []).length,
        last_calculated_at: scoreResult.last_calculated_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return scoreResult;
  }
}

module.exports = new PlatformSyncService();
