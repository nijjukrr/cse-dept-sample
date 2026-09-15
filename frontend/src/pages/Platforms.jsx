import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PlatformConnectionCard from "@/components/PlatformConnectionCard";
import ConnectPlatformModal from "@/components/ConnectPlatformModal";
import VerificationModal from "@/components/VerificationModal";
import ScoreBreakdownModal from "@/components/ScoreBreakdownModal";
import { DotGridSpotlight } from "@/components/chanhdai/DotGridSpotlight";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getPlatforms,
  getStudentPlatforms,
  syncPlatform,
  disconnectPlatform,
} from "@/api/platforms";
import { parseErrorMessage } from "@/utils/errorHandler";
import { ShieldCheck, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

export default function Platforms() {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedPlatformToConnect, setSelectedPlatformToConnect] = useState(null);
  const [verificationTarget, setVerificationTarget] = useState(null); // { platform, connection }
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [platData, connData] = await Promise.all([
        getPlatforms(),
        user ? getStudentPlatforms(user.id) : Promise.resolve({ platforms: [] }),
      ]);
      setPlatforms(platData || []);
      setConnections(connData.platforms || []);
    } catch (err) {
      console.error("Failed to load platforms:", err);
      setGlobalMessage({ type: "error", text: parseErrorMessage(err, "Failed to load platforms") });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPlatform = async (platformCode) => {
    try {
      await syncPlatform(platformCode, user?.id);
      setGlobalMessage({
        type: "success",
        text: `Synchronized ${platformCode.toUpperCase()} successfully!`,
      });
      await fetchData();
    } catch (err) {
      setGlobalMessage({
        type: "error",
        text: parseErrorMessage(err, "Sync failed"),
      });
    }
    setTimeout(() => setGlobalMessage(null), 5000);
  };

  const handleDisconnect = async (platformCode) => {
    if (!window.confirm(`Are you sure you want to disconnect ${platformCode.toUpperCase()}?`)) return;
    try {
      await disconnectPlatform(platformCode, user?.id);
      setGlobalMessage({ type: "info", text: `Disconnected ${platformCode.toUpperCase()}` });
      await fetchData();
    } catch (err) {
      console.error("Disconnect error:", err);
      setGlobalMessage({ type: "error", text: parseErrorMessage(err, "Failed to disconnect platform") });
    }
    setTimeout(() => setGlobalMessage(null), 5000);
  };

  const handleVerifyOwnershipClick = (platform, connection) => {
    setVerificationTarget({ platform, connection });
  };

  const handleVerificationSuccess = async () => {
    setGlobalMessage({
      type: "success",
      text: "Ownership verified! Platform data is now eligible for department leaderboard scoring.",
    });
    await fetchData();
    setTimeout(() => setGlobalMessage(null), 6000);
  };

  const getConnectionForPlatform = (code) => {
    return connections.find((c) => c.platform_code === code);
  };

  const connectedCount = connections.filter(
    (c) => c.connection_status !== "disconnected" && c.connection_status !== "unlinked"
  ).length;

  const verifiedCount = connections.filter(
    (c) => c.ownership_status === "verified"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Hero Header */}
      <DotGridSpotlight className="border-b border-slate-200/80 bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-semibold text-xs">
                  SSIET CSE Department
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono text-slate-500">Achievement Verification Standard</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Connected Platforms
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Connect and verify external developer and competitive programming profiles. Ownership verification guarantees leaderboard credibility before metrics contribute to your department ranking.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <Button
                  variant="outline"
                  onClick={() => setBreakdownOpen(true)}
                  className="gap-2 text-xs"
                >
                  <Sparkles className="h-4 w-4 text-ssiet-gold-500" />
                  Score Explanation
                </Button>
              )}
              <div className="rounded-xl border border-ssiet-green-200 bg-ssiet-green-50/60 px-4 py-2.5 text-right">
                <div className="text-[10px] uppercase font-bold text-slate-500">Verified / Connected</div>
                <div className="text-2xl font-black font-mono text-ssiet-green-800">
                  {verifiedCount} <span className="text-xs font-normal text-slate-500">/ {connectedCount} connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DotGridSpotlight>

      {/* Global alert feedback */}
      {globalMessage && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div
            className={`rounded-lg p-3 text-xs font-medium border flex items-center justify-between ${
              globalMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : globalMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            <span>{globalMessage.text}</span>
            <button
              type="button"
              onClick={() => setGlobalMessage(null)}
              className="text-xs font-bold underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-7 w-7 animate-spin mx-auto text-ssiet-green" />
            <p className="text-sm text-slate-500 mt-2 font-medium">Loading platform connection statuses...</p>
          </div>
        ) : (
          <>
            {/* Platforms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {platforms.map((platform) => {
                const conn = getConnectionForPlatform(platform.code);
                return (
                  <PlatformConnectionCard
                    key={platform.code}
                    platform={platform}
                    connection={conn}
                    isOwner={Boolean(user)}
                    onConnect={(p) => setSelectedPlatformToConnect(p)}
                    onVerifyOwnership={handleVerifyOwnershipClick}
                    onSync={handleSyncPlatform}
                    onDisconnect={handleDisconnect}
                  />
                );
              })}
            </div>

            {/* Architecture Explainer Card */}
            <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-ssiet-green-50 p-3 text-ssiet-green">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Challenge-Based Ownership & Anti-Tampering Standard
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    To maintain strict leaderboard integrity, linked platform profiles require challenge-based ownership verification (publishing a unique system token to your public profile bio or name field). Unverified platforms generate zero competitive points until ownership is confirmed.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Connect Platform Modal */}
      <ConnectPlatformModal
        platform={selectedPlatformToConnect}
        open={Boolean(selectedPlatformToConnect)}
        onOpenChange={(isOpen) => !isOpen && setSelectedPlatformToConnect(null)}
        onSuccess={(newConn) => {
          fetchData();
          // Automatically open verification modal for newly connected platform!
          if (selectedPlatformToConnect && newConn) {
            setVerificationTarget({
              platform: selectedPlatformToConnect,
              connection: newConn,
            });
          }
        }}
      />

      {/* Verification Modal */}
      {verificationTarget && (
        <VerificationModal
          platform={verificationTarget.platform}
          connection={verificationTarget.connection}
          open={Boolean(verificationTarget)}
          onOpenChange={(isOpen) => !isOpen && setVerificationTarget(null)}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {/* Score Breakdown Modal */}
      {user && (
        <ScoreBreakdownModal
          userId={user.id}
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
        />
      )}
    </div>
  );
}
