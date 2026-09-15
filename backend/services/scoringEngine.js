/**
 * SSIET CSE Department - Deterministic Competitive Scoring Engine
 * Version: v1
 * 
 * Formal Pipeline:
 * RAW METRICS -> VALIDATION -> NORMALIZATION -> PLATFORM SCORE -> CATEGORY SCORE -> BREADTH BONUS -> OVERALL SCORE -> RANK
 * 
 * Mathematical Properties:
 * - Deterministic: Same input + scoring configuration = bitwise identical result every time.
 * - Bounded: All category scores capped at 1000, overall capped at 1000.
 * - Bounded Breadth: Multi-platform bonus strictly capped at 40 pts and requires active verified engagement (score >= 20).
 * - Versioned: Stores `scoring_version: "v1"` with calculation metadata.
 * - Explainable: Every single point maps through an explicit attribution tree.
 * - Authoritative: Calculated server-side only; never trusts client-supplied scores.
 */

const { SCORING_CONFIG } = require('../config/scoringConfig');
const { normalizationEngine } = require('./normalizationEngine');

class ScoringEngine {
  constructor(config = SCORING_CONFIG) {
    this.config = config;
  }

  /**
   * Computes the complete authoritative score breakdown for a student
   * @param {Object} student - student identity info
   * @param {Array} platformConnections - raw connection rows
   * @param {Array} departmentAchievements - verified college achievements
   */
  calculateStudentScore(student, platformConnections = [], departmentAchievements = []) {
    // 1. Normalize all platform & department inputs
    const normalizedData = normalizationEngine.normalizeStudentData(
      platformConnections,
      departmentAchievements
    );

    const weights = this.config.weights;
    const cat = normalizedData.categories;
    const caps = this.config.caps;
    const breadthCfg = this.config.breadth;

    // 2. Bound category scores to max category cap (1000 base)
    const problemSolvingScore = Math.min(Math.round(cat.problem_solving || 0), caps.max_category_score);
    const competitiveProgrammingScore = Math.min(Math.round(cat.competitive_programming || 0), caps.max_category_score);
    const openSourceScore = Math.min(Math.round(cat.open_source || 0), caps.max_category_score);
    const certificationsScore = Math.min(Math.round(cat.certifications || 0), caps.max_category_score);
    const collegeAchievementsScore = Math.min(Math.round(cat.college_achievements || 0), caps.max_category_score);

    // 3. Compute weighted base score (Sums to max 1000)
    const psWeighted = problemSolvingScore * weights.problem_solving;
    const cpWeighted = competitiveProgrammingScore * weights.competitive_programming;
    const osWeighted = openSourceScore * weights.open_source;
    const certWeighted = certificationsScore * weights.certifications;
    const colWeighted = collegeAchievementsScore * weights.college_achievements;

    const baseScore = psWeighted + cpWeighted + osWeighted + certWeighted + colWeighted;

    // 4. Bounded Breadth Bonus Model
    // Only verified platforms with positive active score (>= min_score_for_active) qualify
    const activePlatforms = Object.values(normalizedData.platforms).filter(
      (p) => (p.score || 0) >= breadthCfg.min_score_for_active && p.sync_status !== 'failed'
    );
    const activeCount = activePlatforms.length;

    let breadthBonus = 0;
    if (activeCount >= breadthCfg.min_active_platforms) {
      breadthBonus = Math.min(
        breadthCfg.max_breadth_bonus,
        (activeCount - 1) * breadthCfg.points_per_active_platform
      );
    }

    // 5. Compute final overall score (strictly capped at 1000)
    const overallScore = Math.min(caps.max_overall_score, Math.round(baseScore + breadthBonus));

    // 6. Build transparent explanation tree
    const platformBreakdown = {};
    for (const [code, p] of Object.entries(normalizedData.platforms)) {
      platformBreakdown[code] = {
        platform_code: code,
        platform_name: p.platform_name,
        score: p.score,
        category: p.category,
        verification_level: p.verification_level,
        source_type: p.source_type,
        integration_status: p.integration_status,
        availability: p.availability,
        metrics: p.metrics,
        breakdown: p.breakdown,
        fetched_at: p.fetched_at,
        sync_status: p.sync_status,
        note: p.note,
      };
    }

    const explanation = {
      scoring_version: this.config.version,
      overall_score: overallScore,
      base_score: Math.round(baseScore),
      breadth_bonus: breadthBonus,
      breadth_explanation: activeCount >= breadthCfg.min_active_platforms
        ? `${breadthBonus} pts bonus for ${activeCount} active platforms with score >= ${breadthCfg.min_score_for_active} (capped at ${breadthCfg.max_breadth_bonus})`
        : 'No breadth bonus (requires at least 2 active platforms with score >= 20)',
      formula: `OverallScore = min(${caps.max_overall_score}, round(${weights.problem_solving}*PS + ${weights.competitive_programming}*CP + ${weights.open_source}*OS + ${weights.certifications}*CERT + ${weights.college_achievements}*COL + BreadthBonus))`,
      categories: {
        problem_solving: {
          label: 'Problem Solving',
          raw_points: problemSolvingScore,
          weight: weights.problem_solving,
          weighted_contribution: Math.round(psWeighted),
          platforms: Object.values(platformBreakdown)
            .filter((p) => p.category === 'problem_solving')
            .map((p) => ({ platform: p.platform_code, points: p.score, status: p.integration_status })),
        },
        competitive_programming: {
          label: 'Competitive Programming',
          raw_points: competitiveProgrammingScore,
          weight: weights.competitive_programming,
          weighted_contribution: Math.round(cpWeighted),
          platforms: Object.values(platformBreakdown)
            .filter((p) => p.category === 'competitive_programming')
            .map((p) => ({ platform: p.platform_code, points: p.score, status: p.integration_status })),
        },
        open_source: {
          label: 'Open Source & Projects',
          raw_points: openSourceScore,
          weight: weights.open_source,
          weighted_contribution: Math.round(osWeighted),
          platforms: Object.values(platformBreakdown)
            .filter((p) => p.category === 'open_source')
            .map((p) => ({ platform: p.platform_code, points: p.score, status: p.integration_status })),
        },
        certifications: {
          label: 'Certifications & Skills',
          raw_points: certificationsScore,
          weight: weights.certifications,
          weighted_contribution: Math.round(certWeighted),
          platforms: Object.values(platformBreakdown)
            .filter((p) => p.category === 'certifications')
            .map((p) => ({ platform: p.platform_code, points: p.score, status: p.integration_status })),
        },
        college_achievements: {
          label: 'Department Achievements',
          raw_points: collegeAchievementsScore,
          weight: weights.college_achievements,
          weighted_contribution: Math.round(colWeighted),
          verified_count: normalizedData.verifiedAchievementCount,
          raw_points_earned: normalizedData.collegeRawPoints,
        },
      },
      active_platforms_count: activeCount,
      connected_platforms_count: Object.keys(normalizedData.platforms).length,
    };

    return {
      user_id: student.user_id || student.id,
      scoring_version: this.config.version,
      overall_score: overallScore,
      problem_solving_score: problemSolvingScore,
      competitive_programming_score: competitiveProgrammingScore,
      open_source_score: openSourceScore,
      certifications_score: certificationsScore,
      college_achievements_score: collegeAchievementsScore,
      category_breakdown: explanation.categories,
      platform_breakdown: platformBreakdown,
      connected_platform_count: Object.keys(normalizedData.platforms).length,
      explanation,
      last_calculated_at: new Date().toISOString(),
    };
  }

  /**
   * Deterministic sorting comparator for leaderboard rankings
   */
  compareStudents(a, b) {
    if (b.overall_score !== a.overall_score) {
      return b.overall_score - a.overall_score;
    }
    if (b.competitive_programming_score !== a.competitive_programming_score) {
      return b.competitive_programming_score - a.competitive_programming_score;
    }
    if (b.problem_solving_score !== a.problem_solving_score) {
      return b.problem_solving_score - a.problem_solving_score;
    }
    if (b.open_source_score !== a.open_source_score) {
      return b.open_source_score - a.open_source_score;
    }
    if ((b.connected_platform_count || 0) !== (a.connected_platform_count || 0)) {
      return (b.connected_platform_count || 0) - (a.connected_platform_count || 0);
    }
    // Final tie-breaker: strict lexicographical comparison of user ID / roll number
    const idA = String(a.user_id || a.id || a.roll_no || '');
    const idB = String(b.user_id || b.id || b.roll_no || '');
    return idA.localeCompare(idB);
  }
}

function calculateCompetitiveScore(connections = []) {
  const categoryScores = {
    problem_solving: 0,
    competitive_programming: 0,
    open_source: 0,
    certifications: 0,
    college_achievements: 0,
  };

  const activeCategories = new Set();

  for (const conn of connections) {
    if (conn.sync_status === 'failed' || conn.connection_status === 'disconnected') continue;
    const cat = conn.normalized_metrics?.category || 'problem_solving';
    activeCategories.add(cat);
    const score = Number(conn.platform_score || 0);
    if (categoryScores[cat] !== undefined) {
      categoryScores[cat] += score;
    }
  }

  const psScore = categoryScores.problem_solving;
  const cpScore = Math.round(categoryScores.competitive_programming * 1.1);
  const osScore = Math.round(categoryScores.open_source * 0.95);
  const certScore = categoryScores.certifications;

  const breadthBonus = activeCategories.size > 1 ? (activeCategories.size - 1) * 15 : 0;
  const overall = psScore + cpScore + osScore + certScore + breadthBonus;

  return {
    overall_score: overall,
    breadth_bonus: breadthBonus,
    category_breakdown: {
      problem_solving: { score: psScore },
      competitive_programming: { score: cpScore },
      open_source: { score: osScore },
      certifications: { score: certScore },
    },
  };
}

/**
 * Pure deterministic ranking function
 */
function rankStudentsDeterministically(students = []) {
  const cloned = [...students];
  cloned.sort((a, b) => scoringEngine.compareStudents(a, b));

  return cloned.map((s, index) => ({
    ...s,
    rank: index + 1,
  }));
}

const scoringEngine = new ScoringEngine();

module.exports = {
  ScoringEngine,
  scoringEngine,
  calculateCompetitiveScore,
  rankStudentsDeterministically,
};
