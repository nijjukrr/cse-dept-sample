/**
 * SSIET CSE Department - Achievement Normalization Engine
 * Maps raw platform metrics and verified departmental records into normalized categories.
 * Preserves audit trail, source awareness, confidence, and metric availability.
 */

const { getAdapter, getPlatformMeta } = require('../platforms');
const { SCORING_CONFIG } = require('../config/scoringConfig');

class NormalizationEngine {
  /**
   * Normalizes an array of student platform connections and department achievements
   * @param {Array} platformConnections - list of { platform_code, raw_metrics, connection_status }
   * @param {Array} departmentAchievements - list of verified achievements from college db
   */
  normalizeStudentData(platformConnections = [], departmentAchievements = []) {
    const normalizedPlatforms = {};
    const detailedMetrics = [];
    const categoryTotals = {
      problem_solving: 0,
      competitive_programming: 0,
      open_source: 0,
      certifications: 0,
      college_achievements: 0,
    };

    // 1. Process external platforms
    for (const conn of platformConnections) {
      if (conn.connection_status === 'disconnected') continue;

      const meta = getPlatformMeta(conn.platform_code) || {};
      const adapter = getAdapter(conn.platform_code);
      if (!adapter) continue;

      const raw = conn.raw_metrics || {};
      const normalized = adapter.normalizeMetrics(raw);

      // Data availability evaluation
      const hasRawData = raw && Object.keys(raw).length > 0;
      const isPending = meta.integrationStatus === 'integration_pending';
      const isFailed = conn.sync_status === 'failed';
      let availability = 'available';
      if (isPending) availability = 'unavailable';
      else if (isFailed && !hasRawData) availability = 'error';

      const isVerified = conn.ownership_status
        ? conn.ownership_status === 'verified'
        : Boolean(conn.connection_status === 'connected');
      const effectiveScore = isVerified ? (normalized.score || 0) : 0;

      const platformEntry = {
        platform_code: conn.platform_code,
        platform_name: meta.name || conn.platform_code,
        username: conn.username,
        profile_url: conn.profile_url,
        category: normalized.category,
        score: effectiveScore,
        raw_score: normalized.score || 0,
        metrics: normalized.metrics || {},
        breakdown: normalized.breakdown || {},
        confidence: normalized.confidence || (isPending ? 'low' : 'high'),
        verification_level: conn.verification_level || normalized.verification_level || meta.verificationLevel,
        ownership_status: conn.ownership_status || 'unverified',
        verification_token: conn.verification_token || null,
        verified_at: conn.verified_at || null,
        source_type: meta.sourceType || 'unsupported',
        integration_status: meta.integrationStatus || 'integration_pending',
        availability,
        data_status: availability,
        fetched_at: conn.last_synced_at || normalized.fetched_at,
        sync_status: conn.sync_status || 'never_synced',
        note: normalized.note || meta.note || '',
      };

      normalizedPlatforms[conn.platform_code] = platformEntry;

      // Extract granular normalized metrics for explainability audit
      for (const [mKey, mVal] of Object.entries(normalized.metrics || {})) {
        detailedMetrics.push({
          metric_key: `${conn.platform_code}.${mKey}`,
          raw_value: mVal,
          normalized_value: normalized.breakdown?.[`${mKey}_points`] ?? mVal,
          category: normalized.category,
          source_platform: conn.platform_code,
          source_type: platformEntry.source_type,
          confidence: platformEntry.confidence,
          availability: mVal !== null && mVal !== undefined ? 'available' : 'unavailable',
        });
      }

      if (categoryTotals[normalized.category] !== undefined) {
        categoryTotals[normalized.category] += effectiveScore;
      }
    }

    // 2. Process Department Achievements (Hackathons, Internships, Projects, Certifications)
    let collegePoints = 0;
    const verifiedAchievements = (departmentAchievements || []).filter(
      (a) => (a.verified === true || a.status === 'approved') &&
             (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:'))
    );

    for (const ach of verifiedAchievements) {
      collegePoints += (Number(ach.points) || 0);
    }
    // Cap college achievement contribution at 1000 to match platform normalization scales
    categoryTotals.college_achievements = Math.min(collegePoints, SCORING_CONFIG.caps.max_category_score);

    // Apply category caps
    for (const cat of Object.keys(categoryTotals)) {
      categoryTotals[cat] = Math.min(categoryTotals[cat], SCORING_CONFIG.caps.max_category_score);
    }

    return {
      platforms: normalizedPlatforms,
      detailedMetrics,
      categories: categoryTotals,
      verifiedAchievementCount: verifiedAchievements.length,
      collegeRawPoints: collegePoints,
      normalizedAt: new Date().toISOString(),
    };
  }

  /**
   * Determine data freshness based on timestamp
   */
  getFreshnessStatus(timestamp) {
    if (!timestamp) return { status: 'never_synced', label: 'Never Synced', badge: 'neutral' };
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < SCORING_CONFIG.freshness.fresh_threshold_hours) {
      return { status: 'fresh', label: 'Fresh (Updated today)', badge: 'success' };
    }
    if (diffHours < SCORING_CONFIG.freshness.stale_threshold_hours) {
      const days = Math.floor(diffHours / 24);
      return { status: 'stale', label: `Updated ${days}d ago`, badge: 'warning' };
    }
    return { status: 'outdated', label: 'Needs refresh', badge: 'danger' };
  }
}

const normalizationEngine = new NormalizationEngine();

module.exports = {
  NormalizationEngine,
  normalizationEngine,
};
