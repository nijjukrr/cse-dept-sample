import * as React from "react";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { name: "GitHub", code: "github", color: "#24292e", badge: "Open Source" },
  { name: "LeetCode", code: "leetcode", color: "#FFA116", badge: "Problem Solving" },
  { name: "Codeforces", code: "codeforces", color: "#1F8ACB", badge: "Competitive" },
  { name: "CodeChef", code: "codechef", color: "#5B4638", badge: "Contests" },
  { name: "GeeksforGeeks", code: "geeksforgeeks", color: "#2F8D46", badge: "DSA & Core" },
  { name: "HackerRank", code: "hackerrank", color: "#00EA64", badge: "Skill Badges" },
  { name: "Kaggle", code: "kaggle", color: "#20BEFF", badge: "Data Science & AI" },
];

/**
 * Chánh Đại Inspiration: Logos Carousel / Flip
 * Displays external developer platforms connected to the department index.
 */
export function LogosCarousel({ className, onSelectPlatform }) {
  return (
    <div className={cn("w-full py-4 overflow-hidden", className)}>
      <div className="flex items-center justify-start sm:justify-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {PLATFORMS.map((p) => (
          <div
            key={p.code}
            onClick={() => onSelectPlatform && onSelectPlatform(p.code)}
            className="flex-shrink-0 flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-2xs hover:border-ssiet-green-300 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-sm font-semibold text-slate-800 group-hover:text-ssiet-green transition-colors">
              {p.name}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {p.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
