import * as React from "react";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, Flame, ExternalLink, Code } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

/**
 * Chánh Đại Inspiration: Glow Card Grid
 * Distinctive, technical hero visual treatment for top competitive performers.
 */
export function GlowCardGrid({ students = [], onSelectStudent }) {
  if (!students || students.length === 0) return null;

  const topThree = students.slice(0, 3);
  // Order podium: #2, #1, #3 visually if 3 students exist, or natural order
  const podiumOrder = topThree.length >= 3 ? [topThree[1], topThree[0], topThree[2]] : topThree;

  const getRankTheme = (rank) => {
    switch (rank) {
      case 1:
        return {
          glow: "border-amber-400/80 shadow-[0_0_24px_rgba(240,180,0,0.18)] bg-gradient-to-b from-amber-50/40 via-white to-white",
          badge: "bg-amber-500 text-white font-bold",
          icon: <Trophy className="h-5 w-5 text-amber-500" />,
          title: "#1 Champion",
          scoreBg: "bg-amber-50 text-amber-900 border-amber-200",
        };
      case 2:
        return {
          glow: "border-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.15)] bg-gradient-to-b from-slate-50/60 via-white to-white",
          badge: "bg-slate-500 text-white font-bold",
          icon: <Medal className="h-5 w-5 text-slate-400" />,
          title: "#2 Runner Up",
          scoreBg: "bg-slate-50 text-slate-800 border-slate-200",
        };
      case 3:
        return {
          glow: "border-amber-700/40 shadow-[0_0_18px_rgba(180,83,9,0.12)] bg-gradient-to-b from-amber-50/20 via-white to-white",
          badge: "bg-amber-800 text-white font-bold",
          icon: <Award className="h-5 w-5 text-amber-700" />,
          title: "#3 2nd Runner Up",
          scoreBg: "bg-amber-50/50 text-amber-900 border-amber-200",
        };
      default:
        return {
          glow: "border-slate-200 bg-white",
          badge: "bg-slate-200 text-slate-700",
          icon: null,
          title: `#${rank}`,
          scoreBg: "bg-slate-50 text-slate-800 border-slate-200",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      {podiumOrder.map((student, idx) => {
        if (!student) return null;
        const theme = getRankTheme(student.rank);
        const isFirst = student.rank === 1;

        return (
          <div
            key={student.id || idx}
            onClick={() => onSelectStudent && onSelectStudent(student)}
            className={cn(
              "relative group rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden",
              theme.glow,
              isFirst ? "md:-mt-2 md:mb-2" : ""
            )}
          >
            {/* Subtle glow accent blob */}
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-ssiet-green-100/30 blur-2xl group-hover:bg-ssiet-green-200/40 transition-all pointer-events-none" />

            <div>
              {/* Header with Rank & Trophy */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold shadow-sm",
                      theme.badge
                    )}
                  >
                    #{student.rank}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {theme.title}
                  </span>
                </div>
                {theme.icon}
              </div>

              {/* Avatar and Name */}
              <div className="flex items-center gap-3.5 mb-4">
                <Avatar className={cn("h-14 w-14 border-2 shadow-sm", isFirst ? "border-amber-400" : "border-slate-200")}>
                  <AvatarImage src={student.avatar_url} alt={student.name} />
                  <AvatarFallback>{(student.name || "ST").slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold text-slate-900 text-base group-hover:text-ssiet-green transition-colors line-clamp-1">
                    {student.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-medium">{student.roll_no}</span>
                    <span>•</span>
                    <span>{student.class || student.batch || "CSE"}</span>
                  </div>
                </div>
              </div>

              {/* Score Highlight */}
              <div className={cn("rounded-xl border p-3.5 mb-4 flex items-center justify-between", theme.scoreBg)}>
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                    Overall Index
                  </div>
                  <div className="text-2xl font-black font-mono tracking-tight text-slate-900">
                    {student.overall_score || student.score || 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                    Problem Solving
                  </div>
                  <div className="text-sm font-bold font-mono text-ssiet-green">
                    {student.problem_solving_score || 0} pts
                  </div>
                </div>
              </div>

              {/* Connected Platforms Pill List */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {(student.connected_platforms || []).map((p) => (
                  <span
                    key={p.code}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 capitalize shadow-2xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {p.code}
                  </span>
                ))}
                {(!student.connected_platforms || student.connected_platforms.length === 0) && (
                  <span className="text-[11px] text-slate-400 italic">
                    College Achievements: {student.achievement_count || 0}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom action cue */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-ssiet-green transition-colors">
              <span>View score breakdown</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
