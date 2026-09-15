import { describe, it, expect } from 'vitest';
import { scoringEngine, ScoringEngine } from '../services/scoringEngine';
import { normalizationEngine } from '../services/normalizationEngine';
import { SCORING_CONFIG } from '../config/scoringConfig';

describe('Competitive Scoring Engine & Determinism', () => {
  const sampleStudent = {
    user_id: 'user_test_123',
    name: 'Nijju',
    roll_no: '22CSE045',
    class: 'CSE-A',
  };

  const sampleConnections = [
    {
      platform_code: 'github',
      username: 'nijju-dev',
      connection_status: 'connected',
      raw_metrics: {
        publicRepos: 15,
        starsReceived: 20,
        forksReceived: 5,
        followers: 12,
        publicGists: 2,
      },
      last_synced_at: '2026-09-15T09:00:00.000Z',
    },
    {
      platform_code: 'leetcode',
      username: 'nijju_algo',
      connection_status: 'connected',
      raw_metrics: {
        easySolved: 120,
        mediumSolved: 90,
        hardSolved: 25,
        contestRating: 1650,
        contestsAttended: 8,
      },
      last_synced_at: '2026-09-15T09:00:00.000Z',
    },
    {
      platform_code: 'codeforces',
      username: 'nijju_cf',
      connection_status: 'connected',
      raw_metrics: {
        rating: 1420,
        maxRating: 1510,
        rank: 'specialist',
        problemsSolved: 60,
      },
      last_synced_at: '2026-09-15T09:00:00.000Z',
    },
  ];

  const sampleAchievements = [
    { id: 'ach_1', points: 100, type: 'hackathon', position: '1st', verified: true },
    { id: 'ach_2', points: 40, type: 'internship', verified: true },
  ];

  it('is strictly deterministic: identical inputs yield identical score across 10 iterations', () => {
    const firstRun = scoringEngine.calculateStudentScore(
      sampleStudent,
      sampleConnections,
      sampleAchievements
    );

    for (let i = 0; i < 10; i++) {
      const nextRun = scoringEngine.calculateStudentScore(
        sampleStudent,
        sampleConnections,
        sampleAchievements
      );
      expect(nextRun.overall_score).toBe(firstRun.overall_score);
      expect(nextRun.problem_solving_score).toBe(firstRun.problem_solving_score);
      expect(nextRun.competitive_programming_score).toBe(firstRun.competitive_programming_score);
      expect(nextRun.open_source_score).toBe(firstRun.open_source_score);
      expect(nextRun.college_achievements_score).toBe(firstRun.college_achievements_score);
    }
  });

  it('generates a complete, transparent explanation tree with non-empty categories', () => {
    const result = scoringEngine.calculateStudentScore(
      sampleStudent,
      sampleConnections,
      sampleAchievements
    );

    expect(result.explanation).toBeDefined();
    expect(result.explanation.categories.problem_solving.raw_points).toBeGreaterThan(0);
    expect(result.explanation.categories.competitive_programming.raw_points).toBeGreaterThan(0);
    expect(result.explanation.categories.open_source.raw_points).toBeGreaterThan(0);
    expect(result.explanation.categories.college_achievements.raw_points).toBe(140);
  });

  it('breaks ties deterministically using documented hierarchy', () => {
    const studentA = {
      overall_score: 500,
      competitive_programming_score: 300,
      problem_solving_score: 200,
      open_source_score: 100,
      achievement_count: 3,
      roll_no: '22CSE010',
      name: 'Alice',
    };

    const studentB = {
      overall_score: 500,
      competitive_programming_score: 250, // lower CP score
      problem_solving_score: 250,
      open_source_score: 100,
      achievement_count: 3,
      roll_no: '22CSE020',
      name: 'Bob',
    };

    // studentA should rank higher due to higher competitive_programming_score
    const cmp = scoringEngine.compareStudents(studentA, studentB);
    expect(cmp).toBeLessThan(0); // A comes before B
  });

  it('breaks exact score ties by roll number / name, never random database order', () => {
    const studentA = {
      overall_score: 400,
      competitive_programming_score: 200,
      problem_solving_score: 200,
      open_source_score: 100,
      achievement_count: 2,
      roll_no: '22CSE001',
      name: 'Aarav',
    };

    const studentB = {
      overall_score: 400,
      competitive_programming_score: 200,
      problem_solving_score: 200,
      open_source_score: 100,
      achievement_count: 2,
      roll_no: '22CSE002',
      name: 'Bhavin',
    };

    const cmp = scoringEngine.compareStudents(studentA, studentB);
    expect(cmp).toBeLessThan(0); // 22CSE001 comes before 22CSE002
  });

  it('safely handles empty connections and zero achievements without NaN or crash', () => {
    const result = scoringEngine.calculateStudentScore(sampleStudent, [], []);
    expect(result.overall_score).toBe(0);
    expect(result.problem_solving_score).toBe(0);
    expect(Number.isNaN(result.overall_score)).toBe(false);
  });
});

describe('Normalization Engine Freshness Classification', () => {
  it('correctly tags timestamps within 24h as fresh', () => {
    const nowIso = new Date().toISOString();
    const freshness = normalizationEngine.getFreshnessStatus(nowIso);
    expect(freshness.status).toBe('fresh');
  });

  it('tags timestamps older than 24h as stale', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const freshness = normalizationEngine.getFreshnessStatus(threeDaysAgo);
    expect(freshness.status).toBe('stale');
  });

  it('tags missing timestamps as never_synced', () => {
    const freshness = normalizationEngine.getFreshnessStatus(null);
    expect(freshness.status).toBe('never_synced');
  });
});
