import * as React from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

/**
 * Chánh Đại Inspiration: Status Button
 * Communicates live sync status, pending cooldown, or success state.
 */
export function StatusButton({
  status = "idle", // 'idle' | 'syncing' | 'success' | 'stale' | 'failed'
  lastSyncedAt,
  cooldownSeconds = 0,
  onSync,
  disabled = false,
  className,
}) {
  const isSyncing = status === "syncing";
  const hasCooldown = cooldownSeconds > 0;

  const getStatusColor = () => {
    switch (status) {
      case "syncing":
        return "border-blue-300 bg-blue-50/50 text-blue-700";
      case "success":
        return "border-emerald-300 bg-emerald-50/50 text-emerald-700";
      case "stale":
        return "border-amber-300 bg-amber-50/50 text-amber-700";
      case "failed":
        return "border-rose-300 bg-rose-50/50 text-rose-700";
      default:
        return "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
    }
  };

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={disabled || isSyncing || hasCooldown}
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
        getStatusColor(),
        className
      )}
      title={hasCooldown ? `Sync on cooldown (${cooldownSeconds}s remaining)` : "Synchronize platform metrics"}
    >
      <RefreshCw
        className={cn("h-3.5 w-3.5 transition-transform", isSyncing ? "animate-spin text-blue-600" : "group-hover:rotate-45")}
      />
      <span>
        {isSyncing
          ? "Syncing..."
          : hasCooldown
          ? `Wait ${cooldownSeconds}s`
          : status === "stale"
          ? "Refresh Stale Data"
          : "Sync Now"}
      </span>
      {/* Small live status dot */}
      <span className="relative flex h-2 w-2">
        {status === "success" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            status === "success" && "bg-emerald-500",
            status === "stale" && "bg-amber-500",
            status === "failed" && "bg-rose-500",
            status === "syncing" && "bg-blue-500",
            status === "idle" && "bg-slate-300"
          )}
        />
      </span>
    </button>
  );
}
