/**
 * SSIET CSE Department - Platform Data Store
 * Resilient repository for student platform connections, competitive profiles, and sync audit logs.
 * Seamlessly leverages Supabase tables, with automated local persistence fallback.
 */

const fs = require('fs');
const path = require('path');
const { supabase } = require('../db/supabase');

const LOCAL_STORE_PATH = path.join(__dirname, '../db/local_competitive_store.json');

// Memory fallback cache initialized from disk if present
let localState = {
  connections: {},     // keyed by `${userId}_${platformCode}`
  profiles: {},        // keyed by `userId`
  auditLogs: [],
};

try {
  if (fs.existsSync(LOCAL_STORE_PATH)) {
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
    localState = { ...localState, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('[PlatformStore] Could not read local store file, using in-memory state:', e.message);
}

function persistLocalState() {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(localState, null, 2));
  } catch (e) {
    console.warn('[PlatformStore] Error writing to local store file:', e.message);
  }
}

class PlatformStore {
  // ─── Platform Connections ──────────────────────────────────────────────────

  async getStudentConnections(userId) {
    try {
      const { data, error } = await supabase
        .from('student_platform_connections')
        .select('*')
        .eq('user_id', userId);

      if (error && error.message.includes('Could not find the table')) {
        return Object.values(localState.connections).filter((c) => c.user_id === userId);
      }
      if (error) {
        console.error('[PlatformStore] Supabase getStudentConnections error:', error.message);
        return Object.values(localState.connections).filter((c) => c.user_id === userId);
      }
      return data || [];
    } catch (err) {
      return Object.values(localState.connections).filter((c) => c.user_id === userId);
    }
  }

  async getAllStudentConnections() {
    try {
      const { data, error } = await supabase
        .from('student_platform_connections')
        .select('*');

      if (error && error.message.includes('Could not find the table')) {
        return Object.values(localState.connections);
      }
      if (error) {
        return Object.values(localState.connections);
      }
      return data || [];
    } catch (err) {
      return Object.values(localState.connections);
    }
  }

  async upsertStudentConnection(conn) {
    const payload = {
      user_id: conn.user_id,
      platform_code: conn.platform_code,
      username: conn.username,
      profile_url: conn.profile_url,
      connection_status: conn.connection_status || 'connected',
      verification_level: conn.verification_level || 'public_linked',
      ownership_status: conn.ownership_status || 'unverified',
      verification_token: conn.verification_token || null,
      verification_started_at: conn.verification_started_at || null,
      verified_at: conn.verified_at || null,
      sync_status: conn.sync_status || 'never_synced',
      raw_metrics: conn.raw_metrics || {},
      normalized_metrics: conn.normalized_metrics || {},
      platform_score: conn.platform_score || 0,
      last_synced_at: conn.last_synced_at || new Date().toISOString(),
      last_attempted_at: conn.last_attempted_at || new Date().toISOString(),
      error_message: conn.error_message || null,
      updated_at: new Date().toISOString(),
    };

    // Always update local state
    const key = `${conn.user_id}_${conn.platform_code}`;
    localState.connections[key] = { id: localState.connections[key]?.id || `conn_${Date.now()}`, ...payload };
    persistLocalState();

    try {
      const { data, error } = await supabase
        .from('student_platform_connections')
        .upsert([payload], { onConflict: 'user_id,platform_code' })
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      // Supabase table not created yet or offline, local state saved
    }

    return localState.connections[key];
  }

  async deleteStudentConnection(userId, platformCode) {
    const key = `${userId}_${platformCode}`;
    delete localState.connections[key];
    persistLocalState();

    try {
      await supabase
        .from('student_platform_connections')
        .delete()
        .eq('user_id', userId)
        .eq('platform_code', platformCode);
    } catch (e) {
      // Ignore
    }
    return true;
  }

  // ─── Competitive Profiles ──────────────────────────────────────────────────

  async getCompetitiveProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('student_competitive_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.message.includes('Could not find the table')) {
        return localState.profiles[userId] || null;
      }
      if (error) {
        return localState.profiles[userId] || null;
      }
      return data || localState.profiles[userId] || null;
    } catch (err) {
      return localState.profiles[userId] || null;
    }
  }

  async upsertCompetitiveProfile(profile) {
    const payload = {
      user_id: profile.user_id,
      overall_score: profile.overall_score || 0,
      department_rank: profile.department_rank || 0,
      problem_solving_score: profile.problem_solving_score || 0,
      competitive_programming_score: profile.competitive_programming_score || 0,
      open_source_score: profile.open_source_score || 0,
      certifications_score: profile.certifications_score || 0,
      college_achievements_score: profile.college_achievements_score || 0,
      category_breakdown: profile.category_breakdown || {},
      platform_breakdown: profile.platform_breakdown || {},
      connected_platform_count: profile.connected_platform_count || 0,
      last_calculated_at: profile.last_calculated_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localState.profiles[profile.user_id] = payload;
    persistLocalState();

    try {
      const { data, error } = await supabase
        .from('student_competitive_profiles')
        .upsert([payload], { onConflict: 'user_id' })
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      // Fallback used
    }

    return payload;
  }

  async getAllCompetitiveProfiles() {
    try {
      const { data, error } = await supabase
        .from('student_competitive_profiles')
        .select('*');

      if (error && error.message.includes('Could not find the table')) {
        return Object.values(localState.profiles);
      }
      if (error) {
        return Object.values(localState.profiles);
      }
      return data && data.length ? data : Object.values(localState.profiles);
    } catch (err) {
      return Object.values(localState.profiles);
    }
  }

  // ─── Sync Audit Logs ───────────────────────────────────────────────────────

  async logSyncAudit(log) {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: log.user_id,
      platform_code: log.platform_code,
      status: log.status,
      error_category: log.error_category || null,
      duration_ms: log.duration_ms || 0,
      created_at: new Date().toISOString(),
    };

    localState.auditLogs.unshift(entry);
    if (localState.auditLogs.length > 500) localState.auditLogs.pop();
    persistLocalState();

    try {
      await supabase.from('sync_audit_logs').insert([entry]);
    } catch (err) {
      // Supabase table missing
    }

    return entry;
  }
}

const platformStore = new PlatformStore();

module.exports = {
  PlatformStore,
  platformStore,
};
