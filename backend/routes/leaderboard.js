const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { withHttpCache } = require('../services/httpCache');

async function buildLeaderboardFromAchievements(batchFilter, classFilter, limit) {
  let query = supabase
    .from('students')
    .select('user_id, name, roll_no, reg_no, class, batch, year, github, linkedin, avatar_url');

  if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  const { data: students, error } = await query;
  if (error || !students?.length) {
    if (error) console.error('Leaderboard fallback student query error:', error);
    return [];
  }

  const { data: achievements } = await supabase
    .from('achievements')
    .select('user_id, points, type, title, position, verified, description')
    .eq('verified', true);

  const achMap = new Map();
  for (const achievement of achievements || []) {
    if (achievement.description && achievement.description.trim().toUpperCase().includes('[REJECTED:')) {
      continue;
    }
    const current = achMap.get(achievement.user_id) || {
      score: 0,
      count: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      topTitle: null,
      topScore: 0,
    };

    current.score += achievement.points || 0;
    current.count += 1;

    if (achievement.type === 'hackathon') {
      if (achievement.position === '1st') current.gold += 1;
      else if (achievement.position === '2nd') current.silver += 1;
      else if (achievement.position === '3rd') current.bronze += 1;
    }

    const points = achievement.points || 0;
    if (points > current.topScore || (!current.topTitle && achievement.title)) {
      current.topTitle = achievement.title || null;
      current.topScore = points;
    }

    achMap.set(achievement.user_id, current);
  }

  return students
    .map((u) => {
      const stats = achMap.get(u.user_id) || { score: 0, count: 0, gold: 0, silver: 0, bronze: 0, topTitle: null };
      return {
        id: u.user_id,
        name: u.name,
        roll_no: u.roll_no,
        reg_no: u.reg_no,
        class: u.class,
        batch: u.batch,
        year: u.year,
        github: u.github,
        linkedin: u.linkedin,
        avatar_url: u.avatar_url,
        score: stats.score || 0,
        achievement_count: stats.count || 0,
        gold_wins: stats.gold || 0,
        silver_wins: stats.silver || 0,
        bronze_wins: stats.bronze || 0,
        top_achievement: stats.topTitle || null,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((b.achievement_count || 0) !== (a.achievement_count || 0)) return (b.achievement_count || 0) - (a.achievement_count || 0);
      if ((b.gold_wins || 0) !== (a.gold_wins || 0)) return (b.gold_wins || 0) - (a.gold_wins || 0);
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, limit || 100)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

async function buildLeaderboard(batchFilter, classFilter, limit) {
  return buildLeaderboardFromAchievements(batchFilter, classFilter, limit);
}

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const [
      { data: studentRows },
      { data: achRows },
      { count: activeTeams }
    ] = await Promise.all([
      supabase.from('students').select('user_id'),
      supabase.from('achievements').select('user_id, type, position, verified, description').eq('verified', true),
      supabase.from('teams').select('*', { count: 'exact', head: true })
    ]);

    const validStudentUserIds = new Set((studentRows || []).map(s => s.user_id));

    const validApproved = (achRows || []).filter(a => 
      validStudentUserIds.has(a.user_id) && 
      (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:'))
    );

    const totalStudents = studentRows ? studentRows.length : 0;
    const totalAchievements = validApproved.length;
    const totalHackathonWins = validApproved.filter(a => a.type === 'hackathon' && a.position === '1st').length;
    const totalInternships = validApproved.filter(a => a.type === 'internship').length;

    res.json({
      totalStudents,
      totalAchievements,
      totalHackathonWins,
      totalInternships,
      activeTeams: activeTeams || 0,
    });
  } catch (err) {
    console.error('Leaderboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard statistics' });
  }
});

// ─── GET /api/leaderboard/top ─────────────────────────────────────────────────
router.get('/top', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const top = await buildLeaderboard(null, null, 5);
  res.json(top);
});

// ─── GET /api/leaderboard?batch=&class=&limit= ────────────────────────────────
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { batch, class: cls, limit, year } = req.query;
  const board = await buildLeaderboard(batch || year, cls, parseInt(limit) || 100);
  res.json(board);
});

module.exports = router;
