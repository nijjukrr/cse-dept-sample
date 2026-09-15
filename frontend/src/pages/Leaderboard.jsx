import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GlowCardGrid } from "@/components/chanhdai/GlowCardGrid";
import { DotGridSpotlight } from "@/components/chanhdai/DotGridSpotlight";
import ScoreBreakdownModal from "@/components/ScoreBreakdownModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import {
  Search,
  Trophy,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  Code,
  ShieldCheck,
  TrendingUp,
  Clock,
} from "lucide-react";

export default function Leaderboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("overall");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [stats, setStats] = useState(null);

  // Score breakdown modal state
  const [breakdownUserId, setBreakdownUserId] = useState(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        category,
        batch: selectedBatch !== "all" ? selectedBatch : undefined,
        class: selectedClass !== "all" ? selectedClass : undefined,
        search: searchQuery.trim() || undefined,
        limit: 100,
      };

      const [boardRes, statsRes] = await Promise.all([
        axios.get("/api/leaderboard", { params }),
        axios.get("/api/leaderboard/stats"),
      ]);

      setStudents(boardRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [category, selectedBatch, selectedClass, searchQuery]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleOpenBreakdown = (studentId) => {
    setBreakdownUserId(studentId);
    setIsBreakdownOpen(true);
  };

  const myRankEntry = user ? students.find((s) => s.id === user.id) : null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Hero Section */}
      <DotGridSpotlight className="border-b border-slate-200/80 bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="gold" className="text-xs px-2.5 py-0.5">
                  CSE Department Index
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono text-slate-500">Authoritative Competitive Ranking</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Department Leaderboard
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Unified technical score synthesized across GitHub, LeetCode, Codeforces, CodeChef, and verified college achievements. Deterministic, normalized, and explainable.
              </p>
            </div>

            {/* User Quick Rank Callout */}
            {user && (
              <div className="flex items-center gap-3">
                {myRankEntry ? (
                  <div
                    onClick={() => handleOpenBreakdown(user.id)}
                    className="cursor-pointer rounded-2xl border border-ssiet-green-200 bg-ssiet-green-50/70 p-4 transition-all hover:border-ssiet-green-300 hover:shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ssiet-green text-white font-black text-sm">
                        #{myRankEntry.rank}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Your Department Rank
                        </div>
                        <div className="text-lg font-black font-mono text-slate-900">
                          {myRankEntry.overall_score || myRankEntry.score} pts
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] font-medium text-ssiet-green flex items-center gap-1">
                      <span>Why am I ranked #{myRankEntry.rank}?</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                ) : (
                  <Link to="/platforms">
                    <Button variant="secondary" className="text-xs gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      Connect Platforms to Rank
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Strip */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-slate-100">
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Ranked</div>
                <div className="text-xl font-black font-mono text-slate-900">{stats.totalStudents || 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Accounts</div>
                <div className="text-xl font-black font-mono text-ssiet-green">{stats.connectedPlatformsCount || 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hackathon Golds</div>
                <div className="text-xl font-black font-mono text-amber-600">{stats.totalHackathonWins || 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified Internships</div>
                <div className="text-xl font-black font-mono text-blue-600">{stats.totalInternships || 0}</div>
              </div>
            </div>
          )}
        </div>
      </DotGridSpotlight>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Top 3 Spotlight Podium */}
        {!loading && students.length >= 3 && !searchQuery && selectedBatch === "all" && selectedClass === "all" && category === "overall" && (
          <GlowCardGrid
            students={students}
            onSelectStudent={(s) => handleOpenBreakdown(s.id)}
          />
        )}

        {/* Filter Controls Bar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-4">
          {/* Categories Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs value={category} onValueChange={setCategory} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100/90 p-1">
                <TabsTrigger value="overall">Overall Index</TabsTrigger>
                <TabsTrigger value="problem_solving">Problem Solving</TabsTrigger>
                <TabsTrigger value="competitive_programming">Competitive (CP)</TabsTrigger>
                <TabsTrigger value="open_source">Open Source</TabsTrigger>
                <TabsTrigger value="college_achievements">College Wins</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Snapshot synchronized periodically</span>
            </div>
          </div>

          {/* Search and Secondary Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {/* Search */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search coder by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-ssiet-green focus:bg-white focus:outline-none"
              />
            </div>

            {/* Batch Filter */}
            <div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-ssiet-green focus:bg-white focus:outline-none font-medium"
              >
                <option value="all">All Batches</option>
                <option value="2022-2026">Batch 2022-2026</option>
                <option value="2023-2027">Batch 2023-2027</option>
                <option value="2024-2028">Batch 2024-2028</option>
              </select>
            </div>

            {/* Class Filter */}
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-ssiet-green focus:bg-white focus:outline-none font-medium"
              >
                <option value="all">All Sections</option>
                <option value="CSE-A">CSE-A</option>
                <option value="CSE-B">CSE-B</option>
                <option value="CSE-C">CSE-C</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="h-7 w-7 animate-spin mx-auto text-ssiet-green" />
              <p className="text-sm font-medium text-slate-500 mt-2">Computing competitive rankings...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Trophy className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No students match current filters</p>
              <p className="text-xs text-slate-400">Try clearing search or filter selections.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4 hidden sm:table-cell">Class / Roll</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Connected Platforms</th>
                    <th className="py-3.5 px-4 hidden lg:table-cell">Category Subscores</th>
                    <th className="py-3.5 px-4 text-right">Score</th>
                    <th className="py-3.5 px-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((student) => {
                    const isMe = user && student.id === user.id;
                    const isTopThree = student.rank <= 3;

                    return (
                      <tr
                        key={student.id}
                        className={`group transition-colors hover:bg-ssiet-green-50/30 ${
                          isMe ? "bg-ssiet-green-50/50 font-medium" : ""
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                              student.rank === 1
                                ? "bg-amber-500 text-white shadow-xs"
                                : student.rank === 2
                                ? "bg-slate-400 text-white shadow-xs"
                                : student.rank === 3
                                ? "bg-amber-700 text-white shadow-xs"
                                : "text-slate-600 font-mono"
                            }`}
                          >
                            {student.rank}
                          </span>
                        </td>

                        {/* Student Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-slate-200">
                              <AvatarImage src={student.avatar_url} />
                              <AvatarFallback>{(student.name || "ST").slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <Link
                                to={`/profile/${student.id}`}
                                className="font-bold text-slate-900 hover:text-ssiet-green transition-colors line-clamp-1"
                              >
                                {student.name}
                                {isMe && (
                                  <span className="ml-1.5 rounded bg-ssiet-green-100 text-ssiet-green-800 text-[10px] px-1.5 py-0.2 font-semibold">
                                    You
                                  </span>
                                )}
                              </Link>
                              <div className="text-xs text-slate-400 sm:hidden">
                                {student.roll_no} • {student.class}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Class & Roll */}
                        <td className="py-3.5 px-4 hidden sm:table-cell text-xs text-slate-500">
                          <div className="font-mono text-slate-700 font-semibold">{student.roll_no}</div>
                          <div className="text-[11px] text-slate-400">{student.class || student.batch || "CSE"}</div>
                        </td>

                        {/* Connected Platforms Pill list */}
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1.5">
                            {(student.connected_platforms || []).map((p) => (
                              <span
                                key={p.code}
                                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 capitalize border border-slate-200/60"
                              >
                                {p.code}
                              </span>
                            ))}
                            {(!student.connected_platforms || student.connected_platforms.length === 0) && (
                              <span className="text-xs text-slate-400 italic">College achievements</span>
                            )}
                          </div>
                        </td>

                        {/* Category Subscores */}
                        <td className="py-3.5 px-4 hidden lg:table-cell text-xs text-slate-600 font-mono">
                          <div className="flex items-center gap-3">
                            <span title="Problem Solving">PS: <strong>{student.problem_solving_score}</strong></span>
                            <span title="Competitive Programming">CP: <strong>{student.competitive_programming_score}</strong></span>
                            <span title="Open Source">OS: <strong>{student.open_source_score}</strong></span>
                          </div>
                        </td>

                        {/* Overall / Category Score */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className="text-base font-black text-slate-900">
                            {category === "problem_solving"
                              ? student.problem_solving_score
                              : category === "competitive_programming"
                              ? student.competitive_programming_score
                              : category === "open_source"
                              ? student.open_source_score
                              : category === "college_achievements"
                              ? student.college_achievements_score
                              : student.overall_score || student.score}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">pts</span>
                        </td>

                        {/* Action - Open Breakdown */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenBreakdown(student.id)}
                            className="rounded p-1.5 text-slate-400 hover:text-ssiet-green hover:bg-ssiet-green-50 transition-colors"
                            title="Why am I ranked here? View score explanation"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Score Breakdown Modal */}
      {breakdownUserId && (
        <ScoreBreakdownModal
          userId={breakdownUserId}
          open={isBreakdownOpen}
          onOpenChange={setIsBreakdownOpen}
        />
      )}
    </div>
  );
}
