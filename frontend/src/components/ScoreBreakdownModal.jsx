import React, { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { ShieldCheck, Sparkles, ExternalLink, AlertCircle, Info, RefreshCw } from "lucide-react";

export default function ScoreBreakdownModal({ userId, open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && userId) {
      fetchBreakdown(userId);
    } else {
      setData(null);
      setError(null);
    }
  }, [open, userId]);

  const fetchBreakdown = async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/leaderboard/breakdown/${uid}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load score breakdown:", err);
      setError(err.response?.data?.error || "Could not load score explanation");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { key: "problem_solving", label: "Problem Solving", color: "bg-emerald-500", weight: "35%" },
    { key: "competitive_programming", label: "Competitive Programming", color: "bg-blue-500", weight: "25%" },
    { key: "open_source", label: "Open Source & Projects", color: "bg-slate-800", weight: "20%" },
    { key: "certifications", label: "Certifications & Skills", color: "bg-purple-500", weight: "10%" },
    { key: "college_achievements", label: "Department Achievements", color: "bg-amber-500", weight: "10%" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" onClose={() => onOpenChange(false)}>
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="h-7 w-7 animate-spin mx-auto text-ssiet-green" />
            <p className="text-sm font-medium text-slate-600">Calculating explainable score breakdown...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-rose-500" />
            <p className="text-sm font-medium text-slate-800">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-ssiet-green-200">
                    <AvatarImage src={data.student?.avatar_url} />
                    <AvatarFallback>{(data.student?.name || "ST").slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{data.student?.name}</DialogTitle>
                    <DialogDescription>
                      Roll No: <span className="font-mono">{data.student?.roll_no}</span> • {data.student?.class || "CSE"}
                    </DialogDescription>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="gold" className="text-sm px-3 py-1 font-bold">
                    Rank #{data.department_rank} of {data.total_students}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            {/* Overall Score Highlight */}
            <div className="rounded-xl border border-ssiet-green-200 bg-gradient-to-r from-ssiet-green-50/70 via-white to-ssiet-gold-50/40 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Authoritative Competitive Index
                </span>
                <div className="text-3xl font-black font-mono text-slate-900 mt-0.5">
                  {data.overall_score} <span className="text-sm font-normal text-slate-500">pts</span>
                </div>
              </div>
              <div className="text-xs text-right text-slate-500 max-w-[240px]">
                <div className="flex items-center justify-end gap-1 font-medium text-ssiet-green-800">
                  <ShieldCheck className="h-4 w-4 text-ssiet-green" />
                  <span>Deterministic Backend Formula</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Normalized across {data.connected_platform_count} platform{data.connected_platform_count !== 1 ? 's' : ''} + verified wins
                </span>
              </div>
            </div>

            {/* Category Breakdown list */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-ssiet-gold-500" />
                Category Breakdown & Weighting
              </h4>

              <div className="space-y-3">
                {categories.map((c) => {
                  const catData = data.category_breakdown?.[c.key];
                  const rawScore = catData?.raw_points ?? (data[`${c.key}_score`] || 0);
                  const weighted = catData?.weighted_contribution ?? Math.round(rawScore * (data.scoring_weights?.[c.key] || 0.1));

                  return (
                    <div key={c.key} className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3">
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
                          <span className="font-semibold text-slate-800">{c.label}</span>
                          <span className="text-xs text-slate-400">({c.weight} weight)</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-slate-900">{weighted}</span>
                          <span className="text-xs text-slate-400"> (from {rawScore} raw)</span>
                        </div>
                      </div>
                      <Progress value={Math.min((rawScore / 1000) * 100, 100)} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connected Platform Contributions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                Verified Platform Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(data.platform_breakdown || {}).map(([code, p]) => {
                  const isVerified = p.ownership_status === 'verified' || p.score > 0;
                  const isUnverified = p.ownership_status && p.ownership_status !== 'verified';
                  
                  return (
                    <div key={code} className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold capitalize text-slate-800 text-sm">{code}</span>
                        {isVerified && p.score > 0 ? (
                          <Badge variant="verified" className="text-[10px]">
                            +{p.score} pts
                          </Badge>
                        ) : isUnverified ? (
                          <Badge variant="linked" className="text-[10px]">
                            0 pts — Ownership Unverified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            0 pts — No Activity
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        {p.metrics?.total_solved !== undefined && (
                          <div>Solved: <span className="font-semibold text-slate-700">{p.metrics.total_solved}</span> (Easy: {p.metrics.easy_solved || 0}, Med: {p.metrics.medium_solved || 0}, Hard: {p.metrics.hard_solved || 0})</div>
                        )}
                        {p.metrics?.public_repos !== undefined && (
                          <div>Repos: <span className="font-semibold text-slate-700">{p.metrics.public_repos}</span> • Stars: {p.metrics.stars_received || 0}</div>
                        )}
                        {p.metrics?.rating !== undefined && (
                          <div>Contest Rating: <span className="font-semibold text-slate-700">{p.metrics.rating}</span></div>
                        )}
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span>Verification: {isVerified ? "Verified Ownership" : "Unverified"}</span>
                          <span>Sync: {p.sync_status || "synced"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!data.platform_breakdown || Object.keys(data.platform_breakdown).length === 0) && (
                  <div className="col-span-2 text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No external platform accounts connected yet. Score currently based solely on verified department achievements.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
