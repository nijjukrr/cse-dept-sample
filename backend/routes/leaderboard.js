/**
 * SSIET CSE Department - Competitive Leaderboard API
 * 
 * Features:
 * - Authoritative, normalized department scoring
 * - Category-aware filtering: Problem Solving, Competitive Programming, Open Source, Certifications, Department Wins
 * - Deterministic tie-breaking hierarchy
 * - Transparent & explainable score breakdown endpoint: /api/leaderboard/breakdown/:userId
 * - Freshness metadata
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { platformStore } = require('../services/platformStore');
const { scoringEngine } = require('../services/scoringEngine');
const { normalizationEngine } = require('../services/normalizationEngine');
const { SCORING_CONFIG } = require('../config/scoringConfig');

async function buildUnifiedLeaderboard({ batchFilter, classFilter, category = 'overall', limit = 100, search = '' }) {
  // 1. Fetch students
  let query = supabase
    .from('students')
    .select('user_id, name, roll_no, reg_no, class, batch, year, github, linkedin, avatar_url');

  if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  const { data: students, error: sErr } = await query;
  if (sErr || !students?.length) {
    if (sErr) console.error('[Leaderboard] Student query error:', sErr);
    return [];
  }

  // 2. Fetch all verified department achievements
  const { data: achievements } = await supabase
    .from('achievements')
    .select('user_id, points, type, title, position, verified, status, description')
    .eq('verified', true);

  const achMap = new Map();
  for (const a of achievements || []) {
    if (a.description && a.description.trim().toUpperCase().includes('[REJECTED:')) continue;
    const current = achMap.get(a.user_id) || [];
    current.push(a);
    achMap.set(a.user_id, current);
  }

  // 3. Fetch all competitive profiles & platform connections
  const [storedProfiles, allConnections] = await Promise.all([
    platformStore.getAllCompetitiveProfiles(),
    platformStore.getAllStudentConnections(),
  ]);

  const profileMap = new Map((storedProfiles || []).map((p) => [p.user_id, p]));
  const connMap = new Map();
  for (const c of allConnections || []) {
    const list = connMap.get(c.user_id) || [];
    list.push(c);
    connMap.set(c.user_id, list);
  }

  // 4. Compute / assemble entry for each student
  const leaderboardEntries = students.map((s) => {
    const userAchs = achMap.get(s.user_id) || [];
    const userConns = connMap.get(s.user_id) || [];
    let compProfile = profileMap.get(s.user_id);

    // If profile not yet calculated or needs refresh, calculate dynamically
    if (!compProfile) {
      compProfile = scoringEngine.calculateStudentScore(s, userConns, userAchs);
    }

    const goldWins = userAchs.filter((a) => a.type === 'hackathon' && a.position === '1st').length;
    const silverWins = userAchs.filter((a) => a.type === 'hackathon' && a.position === '2nd').length;
    const bronzeWins = userAchs.filter((a) => a.type === 'hackathon' && a.position === '3rd').length;

    // Platform badges summary
    const connectedPlatforms = userConns
      .filter((c) => c.connection_status !== 'disconnected')
      .map((c) => ({
        code: c.platform_code,
        username: c.username,
        score: c.platform_score || 0,
        sync_status: c.sync_status || 'never_synced',
        last_synced_at: c.last_synced_at,
        freshness: normalizationEngine.getFreshnessStatus(c.last_synced_at),
      }));

    return {
      id: s.user_id,
      name: s.name,
      roll_no: s.roll_no,
      reg_no: s.reg_no,
      class: s.class,
      batch: s.batch,
      year: s.year,
      github: s.github,
      linkedin: s.linkedin,
      avatar_url: s.avatar_url,
      // Canonical scores
      overall_score: compProfile.overall_score || 0,
      score: compProfile.overall_score || 0, // backward compat with existing components
      problem_solving_score: compProfile.problem_solving_score || 0,
      competitive_programming_score: compProfile.competitive_programming_score || 0,
      open_source_score: compProfile.open_source_score || 0,
      certifications_score: compProfile.certifications_score || 0,
      college_achievements_score: compProfile.college_achievements_score || 0,
      // Metadata
      achievement_count: userAchs.length,
      gold_wins: goldWins,
      silver_wins: silverWins,
      bronze_wins: bronzeWins,
      connected_platforms: connectedPlatforms,
      connected_platform_count: connectedPlatforms.length,
      last_calculated_at: compProfile.last_calculated_at || new Date().toISOString(),
    };
  });

  // 5. Search filter
  let filtered = leaderboardEntries;
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (s) => s.name.toLowerCase().includes(q) || s.roll_no.toLowerCase().includes(q)
    );
  }

  // 6. Sort deterministically based on requested category
  filtered.sort((a, b) => {
    if (category === 'problem_solving') {
      if (b.problem_solving_score !== a.problem_solving_score) return b.problem_solving_score - a.problem_solving_score;
    } else if (category === 'competitive_programming') {
      if (b.competitive_programming_score !== a.competitive_programming_score) return b.competitive_programming_score - a.competitive_programming_score;
    } else if (category === 'open_source') {
      if (b.open_source_score !== a.open_source_score) return b.open_source_score - a.open_source_score;
    } else if (category === 'certifications') {
      if (b.certifications_score !== a.certifications_score) return b.certifications_score - a.certifications_score;
    } else if (category === 'college_achievements') {
      if (b.college_achievements_score !== a.college_achievements_score) return b.college_achievements_score - a.college_achievements_score;
    }
    // Overall tie-breaking hierarchy
    return scoringEngine.compareStudents(a, b);
  });

  // 7. Assign ranks and limit
  return filtered.slice(0, limit || 100).map((u, i) => ({
    ...u,
    rank: i + 1,
  }));
}

// ─── GET /api/leaderboard/breakdown/:userId ────────────────────────────────────
// Fully explainable score breakdown endpoint ("Why am I ranked #4?")
router.get('/breakdown/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const [
      { data: student },
      userConns,
      { data: achievements },
    ] = await Promise.all([
      supabase.from('students').select('*').eq('user_id', userId).maybeSingle(),
      platformStore.getStudentConnections(userId),
      supabase.from('achievements').select('*').eq('user_id', userId).eq('verified', true),
    ]);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const profileScore = scoringEngine.calculateStudentScore(
      student,
      userConns || [],
      achievements || []
    );

    // Compute student's current department rank
    const fullBoard = await buildUnifiedLeaderboard({ limit: 1000 });
    const rankEntry = fullBoard.find((s) => s.id === userId);
    const departmentRank = rankEntry ? rankEntry.rank : 1;

    res.json({
      student: {
        id: student.user_id,
        name: student.name,
        roll_no: student.roll_no,
        class: student.class,
        batch: student.batch,
        avatar_url: student.avatar_url,
      },
      department_rank: departmentRank,
      total_students: fullBoard.length,
      ...profileScore,
      scoring_weights: SCORING_CONFIG.weights,
    });
  } catch (err) {
    console.error('Error fetching score breakdown:', err);
    res.status(500).json({ error: 'Failed to generate score breakdown' });
  }
});

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const [
      { data: studentRows },
      { data: achRows },
      { count: activeTeams },
      allConnections,
    ] = await Promise.all([
      supabase.from('students').select('user_id'),
      supabase.from('achievements').select('user_id, type, position, verified, description').eq('verified', true),
      supabase.from('teams').select('*', { count: 'exact', head: true }),
      platformStore.getAllStudentConnections(),
    ]);

    const validApproved = (achRows || []).filter(
      (a) => !a.description || !a.description.trim().toUpperCase().includes('[REJECTED:')
    );

    const connectedCount = (allConnections || []).filter(
      (c) => c.connection_status === 'connected'
    ).length;

    res.json({
      totalStudents: studentRows ? studentRows.length : 0,
      totalAchievements: validApproved.length,
      totalHackathonWins: validApproved.filter((a) => a.type === 'hackathon' && a.position === '1st').length,
      totalInternships: validApproved.filter((a) => a.type === 'internship').length,
      activeTeams: activeTeams || 0,
      connectedPlatformsCount: connectedCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Leaderboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard statistics' });
  }
});

// ─── GET /api/leaderboard/top ─────────────────────────────────────────────────
router.get('/top', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const top = await buildUnifiedLeaderboard({ limit: 5 });
  res.json(top);
});

// ─── GET /api/leaderboard?batch=&class=&category=&search=&limit= ───────────────
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { batch, class: cls, limit, year, category, search } = req.query;
  const board = await buildUnifiedLeaderboard({
    batchFilter: batch || year,
    classFilter: cls,
    category: category || 'overall',
    limit: parseInt(limit) || 100,
    search: search || '',
  });
  res.json(board);
});

module.exports = router;
