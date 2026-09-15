import React, { useState } from "react";
import { ExternalLink, Trash2, Clock, ShieldAlert, ShieldCheck, HelpCircle } from "lucide-react";
import { StatusButton } from "@/components/chanhdai/StatusButton";
import { Badge } from "@/components/ui/Badge";
import { resolvePlatformConnectionStatus } from "@/utils/competitiveHelpers";
import { formatTimeAgo } from "@/lib/utils";

export default function PlatformConnectionCard({
  platform,
  connection,
  onConnect,
  onVerifyOwnership,
  onSync,
  onDisconnect,
  isOwner = false,
}) {
  const [syncing, setSyncing] = useState(false);

  const statusMeta = resolvePlatformConnectionStatus(connection, platform);

  const handleSync = async () => {
    if (!onSync || syncing) return;
    setSyncing(true);
    try {
      await onSync(platform.code);
    } finally {
      setSyncing(false);
    }
  };

  const syncStatus = connection?.sync_status || 'never_synced';
  const freshness = connection?.freshness?.label || (connection?.last_synced_at ? formatTimeAgo(connection.last_synced_at) : 'Never synced');

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-ssiet-green-200 hover:shadow-xs transition-all flex flex-col justify-between">
      <div>
        {/* Header: Platform Name + Category + Verification Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="h-3.5 w-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: platform.brandColor || "#333" }}
            />
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{platform.name}</h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {platform.categoryLabel || platform.category}
              </span>
            </div>
          </div>

          <Badge variant={statusMeta.badgeVariant} className="text-[10px] shrink-0">
            {statusMeta.badgeText}
          </Badge>
        </div>

        {/* Middle Body: Connection details, score eligibility, and metrics */}
        {statusMeta.isLinked ? (
          <div className="space-y-2 mb-4 bg-slate-50/75 rounded-lg p-3 border border-slate-100">
            <div className="flex items-center justify-between">
              <a
                href={connection.profile_url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs font-semibold text-ssiet-green hover:underline flex items-center gap-1 truncate max-w-[180px]"
              >
                @{connection.username}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>

              {/* Score Display: Differentiates verified points vs unverified zero */}
              <span className={`font-mono font-bold text-xs ${statusMeta.isVerified ? "text-slate-900" : "text-amber-700"}`}>
                {statusMeta.isVerified ? `+${connection.platform_score || 0} pts` : "0 pts"}
              </span>
            </div>

            {/* Score Eligibility banner */}
            <div className="text-[11px] pt-1 border-t border-slate-200/60 font-medium">
              {statusMeta.isVerified ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-600" />
                  {statusMeta.scoreEligibilityText}
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 shrink-0 text-amber-600" />
                  {statusMeta.scoreEligibilityText}
                </span>
              )}
            </div>

            {/* Metrics highlights if available */}
            {statusMeta.isVerified && connection.normalized_metrics?.metrics && (
              <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-slate-200/60">
                {connection.normalized_metrics.metrics.total_solved !== undefined && (
                  <span>Solved: <strong>{connection.normalized_metrics.metrics.total_solved}</strong></span>
                )}
                {connection.normalized_metrics.metrics.rating !== undefined && (
                  <span>Rating: <strong>{connection.normalized_metrics.metrics.rating}</strong></span>
                )}
                {connection.normalized_metrics.metrics.public_repos !== undefined && (
                  <span>Repos: <strong>{connection.normalized_metrics.metrics.public_repos}</strong></span>
                )}
                {connection.normalized_metrics.metrics.stars_received !== undefined && (
                  <span>Stars: <strong>{connection.normalized_metrics.metrics.stars_received}</strong></span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {freshness}
              </span>
              {syncStatus === 'failed' && (
                <span className="text-rose-600 font-medium">Sync issue (cached snapshot retained)</span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-slate-500 line-clamp-2">
              {platform.description || "Connect your account to synchronize technical achievements."}
            </p>
            <div className="text-[11px] text-slate-400 font-medium">
              {statusMeta.scoreEligibilityText}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {statusMeta.statusKey === 'INTEGRATION_PENDING' ? (
          <span className="text-xs text-slate-400 font-medium italic w-full text-center py-1">
            Integration pending — no actions
          </span>
        ) : statusMeta.isLinked ? (
          <>
            {/* If unverified or verification failed, show "Verify Ownership" CTA */}
            {!statusMeta.isVerified ? (
              isOwner && onVerifyOwnership ? (
                <button
                  type="button"
                  onClick={() => onVerifyOwnership(platform, connection)}
                  className="w-full rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 py-1.5 px-3 text-xs font-bold text-amber-900 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                  Verify Ownership
                </button>
              ) : (
                <span className="text-xs text-amber-700 font-medium">Ownership unverified</span>
              )
            ) : (
              /* Verified platform: Show Sync button */
              isOwner && (
                <StatusButton
                  status={syncing ? "syncing" : syncStatus === 'success' ? 'success' : syncStatus === 'failed' ? 'failed' : 'idle'}
                  onSync={handleSync}
                  disabled={syncing}
                />
              )
            )}

            {/* Disconnect button for account owner */}
            {isOwner && onDisconnect && (
              <button
                type="button"
                onClick={() => onDisconnect(platform.code)}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors shrink-0"
                title="Disconnect account"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          /* Unlinked platform: Show Connect button */
          isOwner && onConnect && (
            <button
              type="button"
              onClick={() => onConnect(platform)}
              className="w-full text-center rounded-lg border border-dashed border-ssiet-green-300 bg-ssiet-green-50/50 hover:bg-ssiet-green-50 py-2 text-xs font-semibold text-ssiet-green transition-colors"
            >
              + Connect {platform.name}
            </button>
          )
        )}
      </div>
    </div>
  );
}
