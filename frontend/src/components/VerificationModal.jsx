import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { Separator } from "@/components/ui/Separator";
import {
  startPlatformVerification,
  confirmPlatformVerification,
} from "@/api/platforms";
import { parseErrorMessage } from "@/utils/errorHandler";
import { resolvePlatformConnectionStatus } from "@/utils/competitiveHelpers";
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  RefreshCw,
  KeyRound,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function VerificationModal({
  platform,
  connection,
  open,
  onOpenChange,
  onSuccess,
}) {
  const [token, setToken] = useState(connection?.verification_token || null);
  const [placementHint, setPlacementHint] = useState("");
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (open && platform && connection) {
      setError(null);
      setSuccessMsg(null);
      // If token already exists on connection, set it
      if (connection.verification_token) {
        setToken(connection.verification_token);
        setPlacementHint(getPlacementHintForPlatform(platform.code));
      } else {
        // Automatically start challenge verification on modal open if unverified
        handleStartVerification();
      }
    } else {
      setToken(null);
      setError(null);
      setSuccessMsg(null);
      setCopied(false);
    }
  }, [open, platform?.code, connection?.username]);

  const getPlacementHintForPlatform = (code) => {
    if (code === "leetcode") return "your LeetCode 'About Me' section";
    if (code === "codeforces") return "your Codeforces 'First Name' or 'Last Name' field";
    if (code === "github") return "your GitHub profile Bio";
    return "your public profile Bio or About section";
  };

  const handleStartVerification = async () => {
    if (!platform) return;
    setStarting(true);
    setError(null);
    try {
      const res = await startPlatformVerification(platform.code);
      setToken(res.verification_token);
      setPlacementHint(
        res.placement_hint || getPlacementHintForPlatform(platform.code)
      );
    } catch (err) {
      console.error("Start verification failed:", err);
      setError(
        parseErrorMessage(err, "Could not start verification process. Please try again.")
      );
    } finally {
      setStarting(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!platform || confirming) return;
    setConfirming(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await confirmPlatformVerification(platform.code);
      setSuccessMsg("Ownership verified successfully! Your profile is now eligible for leaderboard scoring.");
      if (onSuccess) {
        onSuccess(res);
      }
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error("Confirm verification error:", err);
      const rawErr = err.response?.data;
      if (rawErr?.error === "Verification token not found on profile") {
        setError(
          `Verification code was not found on your ${platform.name} profile. Please make sure you saved the exact token in ${
            placementHint || "your public bio"
          } and try again.`
        );
      } else if (rawErr?.error === "No active verification process for this platform") {
        setError("Verification code expired or not active. Generating a new code...");
        handleStartVerification();
      } else {
        setError(parseErrorMessage(err, "Verification failed. Please ensure the token is published and try again."));
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!platform || !connection) return null;

  const statusMeta = resolvePlatformConnectionStatus(connection, platform);
  const profileUrl =
    connection.profile_url ||
    platform.profileUrlTemplate?.replace("{username}", connection.username);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="h-4 w-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: platform.brandColor || "#10B981" }}
              />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Verify Ownership — {platform.name}
              </DialogTitle>
            </div>
            <Badge variant={statusMeta.badgeVariant}>
              {statusMeta.badgeText}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Student: <span className="font-semibold text-slate-700">@{connection.username}</span> • Verify public account ownership to enable leaderboard scoring.
          </DialogDescription>
        </DialogHeader>

        {/* 3-Step Verification Pipeline */}
        <div className="space-y-4 py-1">
          {/* Step Sequence Bar */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-semibold text-slate-500 bg-slate-100/80 p-1.5 rounded-lg border border-slate-200/60">
            <div className={`py-1 rounded ${token ? "bg-emerald-600 text-white font-bold" : "bg-white text-slate-700"}`}>
              1. Code
            </div>
            <div className={`py-1 rounded ${token ? "bg-emerald-600 text-white font-bold" : "bg-white text-slate-700"}`}>
              2. Publish
            </div>
            <div className={`py-1 rounded ${confirming ? "bg-emerald-600 text-white font-bold" : "bg-white text-slate-700"}`}>
              3. Confirm
            </div>
          </div>

          {/* Token Box Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-ssiet-green" />
                Your Verification Token
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Active challenge
              </span>
            </div>

            {starting ? (
              <div className="py-4 text-center text-xs text-slate-500 space-y-1">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-ssiet-green" />
                <p>Generating verification token...</p>
              </div>
            ) : token ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 tracking-wider shadow-2xs break-all select-all">
                  {token}
                </div>
                <Button
                  type="button"
                  variant={copied ? "success" : "outline"}
                  size="sm"
                  onClick={handleCopyToken}
                  aria-label="Copy verification token"
                  className="h-10 px-3 flex-shrink-0 font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="py-2 text-center">
                <Button variant="outline" size="sm" onClick={handleStartVerification}>
                  Generate Code
                </Button>
              </div>
            )}
          </div>

          {/* Platform Instructions */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 text-xs text-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-ssiet-green" />
              How to verify:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-slate-600 font-medium">
              <li>Copy the verification token above.</li>
              <li>
                Open your public <span className="font-bold text-slate-900">{platform.name}</span> profile and paste the token into{" "}
                <span className="font-bold text-ssiet-green-800">{placementHint || "your public bio"}</span>.
              </li>
              <li>Save changes on {platform.name}.</li>
              <li>Return here and click <span className="font-bold text-slate-900">"Verify Ownership"</span>.</li>
            </ol>

            {profileUrl && (
              <div className="pt-1">
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-ssiet-green hover:underline"
                >
                  Open {platform.name} Profile <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Error Feedback Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Feedback Alert */}
          {successMsg && (
            <Alert variant="success">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <AlertTitle>Verified!</AlertTitle>
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmVerification}
            disabled={confirming || !token || starting}
            className="gap-2"
          >
            {confirming ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Verify Ownership
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
