import React, { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

export default function ConnectPlatformModal({ platform, open, onOpenChange, onSuccess }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!platform) return null;

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username / handle is required");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMsg("Verifying username & fetching initial metrics...");

    try {
      const res = await axios.post("/api/platforms/connect", {
        platform_code: platform.code,
        username: username.trim(),
      });

      setStatusMsg("Connected successfully!");
      if (onSuccess) onSuccess(res.data.connection);
      setTimeout(() => {
        onOpenChange(false);
        setUsername("");
        setStatusMsg(null);
      }, 700);
    } catch (err) {
      console.error("Connect failed:", err);
      setError(err.response?.data?.error || "Failed to connect platform handle");
      setStatusMsg(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <form onSubmit={handleConnect}>
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: platform.brandColor || "#333" }}
              />
              <DialogTitle>Connect {platform.name}</DialogTitle>
            </div>
            <DialogDescription>
              Link your public {platform.name} handle to synchronize verified metrics into your department profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {platform.name} Username or Handle
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={`e.g. ${platform.code === 'github' ? 'octocat' : platform.code === 'leetcode' ? 'neetcoder' : 'tourist'}`}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-ssiet-green focus:outline-none focus:ring-1 focus:ring-ssiet-green font-mono"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Profile URL preview: <span className="font-mono text-slate-600">{platform.profileUrlTemplate?.replace('{username}', username || 'username')}</span>
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {statusMsg && !error && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                {loading ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                <span>{statusMsg}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !username.trim()}>
              {loading ? "Verifying..." : `Connect ${platform.name}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
