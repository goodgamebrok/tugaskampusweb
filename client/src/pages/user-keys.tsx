"use client"

import { useEffect, useMemo, useState } from "react";
import { Cpu, Loader2, RotateCcw, Clock, KeyRound, Shield, RefreshCw, Terminal, Copy, CheckCheck } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useUserAuth } from "@/lib/user-auth";

type UserKeyRow = {
  id: number;
  keyCode: string;
  packageTitle: string | null;
  status: string;
  durationMonths: number;
  durationDays: number | null;
  expiresAt: string | null;
  hwid?: string | null;
  hwidResetAt?: string | null;
  createdAt: string;
};

function isLifetimeKey(k: UserKeyRow): boolean {
  return k.durationMonths === 0 && (k.durationDays == null || Number(k.durationDays) === 0);
}

function formatDateId(value: string | null) {
  if (!value) return "\u2014";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatRemaining(ms: number): string {
  if (ms <= 0 || !Number.isFinite(ms)) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusVariant(status: string) {
  if (status === "active") return "default" as const;
  if (status === "expired") return "destructive" as const;
  return "secondary" as const;
}

export function UserKeys() {
  const { toast } = useToast();
  const { token } = useUserAuth();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTargetKey, setResetTargetKey] = useState<UserKeyRow | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data, isLoading } = useQuery<{ keys: UserKeyRow[] }>({
    queryKey: ["/api/user/keys"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/user/keys", { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal ambil keys");
      return json;
    },
  });

  const keys = data?.keys || [];
  const stats = useMemo(() => {
    const total = keys.length;
    const active = keys.filter((k) => k.status === "active").length;
    const expired = keys.filter((k) => k.status === "expired").length;
    const resetReady = keys.filter((k) => {
      if (k.status !== "active") return false;
      if (!k.hwid) return false;
      if (!k.hwidResetAt) return true;
      const next = new Date(k.hwidResetAt).getTime() + 20 * 60 * 1000;
      return nowMs >= next;
    }).length;
    return { total, active, expired, resetReady };
  }, [keys, nowMs]);

  const resetHwidMutation = useMutation({
    mutationFn: async (key: UserKeyRow) => {
      const res = await fetch(`/api/user/keys/${key.id}/reset-hwid`, {
        method: "POST",
        headers: authHeaders,
      });
      const json = await res.json();
      if (res.status === 429) throw new Error(json.message || "Bisa reset lagi dalam 20 menit");
      if (!res.ok) throw new Error(json.message || "Gagal reset HWID");
      return json as { success: boolean; message: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/keys"] });
      toast({ title: "Berhasil", description: result.message || "HWID berhasil di-reset" });
      setResetDialogOpen(false);
      setResetTargetKey(null);
    },
    onError: (e: unknown) => {
      toast({ title: "Gagal reset", description: e instanceof Error ? e.message : "Terjadi error", variant: "destructive" });
    },
  });

  const { data: loaderData } = useQuery<{ loaderScript: string | null }>({
    queryKey: ["/api/loader-script"],
    queryFn: async () => {
      const res = await fetch("/api/loader-script");
      if (!res.ok) return { loaderScript: null };
      return res.json();
    },
  });
  const globalLoaderScript = loaderData?.loaderScript;
  const hasValidKey = keys.some((k) => k.status === "active" || k.status === "sold");

  const handleCopy = () => {
    if (!globalLoaderScript) return;
    navigator.clipboard.writeText(globalLoaderScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-headline-lg text-2xl text-kv-on-surface font-bold tracking-tight">My Keys</h1>
        <p className="text-sm text-kv-on-surface-variant mt-1">Kelola license key dan hardware ID kamu.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-5 transition-colors hover:border-kv-primary/30">
          <div className="flex items-center gap-2 text-kv-on-surface-variant mb-3">
            <KeyRound className="h-4 w-4 text-kv-primary" />
            <span className="text-[11px] font-medium uppercase tracking-widest font-mono">Total</span>
          </div>
          <div className="font-headline-lg text-3xl font-bold tabular-nums text-kv-on-surface">{stats.total}</div>
        </div>
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-5 transition-colors hover:border-kv-primary/30">
          <div className="flex items-center gap-2 text-kv-on-surface-variant mb-3">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-medium uppercase tracking-widest font-mono">Aktif</span>
          </div>
          <div className="font-headline-lg text-3xl font-bold tabular-nums text-emerald-400">{stats.active}</div>
          {stats.expired > 0 && <div className="text-xs text-kv-on-surface-variant mt-1">{stats.expired} expired</div>}
        </div>
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-5 transition-colors hover:border-kv-primary/30">
          <div className="flex items-center gap-2 text-kv-on-surface-variant mb-3">
            <RefreshCw className="h-4 w-4 text-kv-secondary" />
            <span className="text-[11px] font-medium uppercase tracking-widest font-mono">Reset Ready</span>
          </div>
          <div className="font-headline-lg text-3xl font-bold tabular-nums text-kv-on-surface">{stats.resetReady}</div>
        </div>
      </div>

      {/* ── Loader Script Section ── */}
      {hasValidKey && globalLoaderScript && (
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 overflow-hidden">
          <div className="px-6 py-5 border-b border-kv-outline-variant/10 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-headline-lg text-lg text-kv-on-surface font-semibold">
                <Terminal className="h-5 w-5 text-kv-primary" />
                Loader Script
              </h2>
              <p className="text-sm text-kv-on-surface-variant mt-1">Copy script di bawah dan paste di executor kamu.</p>
            </div>
          </div>
          <div className="p-6">
            <div className="rounded-xl border border-kv-outline-variant/15 bg-[#12121A] p-4 relative group">
              <div className="absolute top-4 right-4 z-10">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-kv-outline-variant/20 bg-kv-surface/50 hover:bg-kv-primary/10 hover:text-kv-primary hover:border-kv-primary/30 transition-all text-xs" 
                  onClick={handleCopy}
                >
                  {copied ? <CheckCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
                <span className="ml-2 font-mono text-[10px] text-kv-on-surface-variant/50">script.lua</span>
              </div>
              <pre className="overflow-x-auto text-[13px] leading-relaxed text-emerald-300/90 scrollbar-thin font-mono pb-2">
                <code>{globalLoaderScript}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Reset HWID Dialog */}
      <AlertDialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) setResetTargetKey(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Hardware ID</AlertDialogTitle>
            <AlertDialogDescription>
              Ini akan melepas device yang terikat ke key ini. Setelah reset, key bisa dipakai di device baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {resetTargetKey ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Key</span>
                <span className="font-mono font-medium">{resetTargetKey.keyCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">HWID</span>
                <span className="max-w-[200px] truncate font-mono text-xs">{resetTargetKey.hwid || "\u2014"}</span>
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetHwidMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetTargetKey && resetHwidMutation.mutate(resetTargetKey)}
              disabled={!resetTargetKey || resetHwidMutation.isPending}
            >
              {resetHwidMutation.isPending ? "Memproses..." : "Reset HWID"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Key List */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-kv-on-surface-variant">
          <Loader2 className="h-6 w-6 animate-spin text-kv-primary" />
          <span className="text-sm font-medium">Memuat data...</span>
        </div>
      ) : keys.length === 0 ? (
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-12 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-kv-primary/10 p-5 mb-5 ring-4 ring-kv-primary/5">
            <KeyRound className="h-8 w-8 text-kv-primary" />
          </div>
          <p className="text-lg font-headline-lg font-semibold text-kv-on-surface">Belum Ada Key</p>
          <p className="text-sm text-kv-on-surface-variant mt-2 max-w-sm">Kamu belum memiliki key. Silakan beli paket di Store untuk mendapatkan key pertamamu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => {
            const isActive = k.status === "active";
            const hasHwid = !!k.hwid;
            const nextAllowedAt = k.hwidResetAt ? new Date(k.hwidResetAt).getTime() + 20 * 60 * 1000 : null;
            const msLeft = nextAllowedAt ? nextAllowedAt - nowMs : 0;
            const canReset = isActive && hasHwid && (!nextAllowedAt || msLeft <= 0);

            return (
              <div key={k.id} className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 overflow-hidden transition-all duration-300 hover:border-kv-primary/40 hover:shadow-lg hover:shadow-kv-primary/5">
                {/* Top section */}
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-mono text-lg font-bold text-kv-primary break-all tracking-wide">{k.keyCode}</div>
                      <div className="text-sm text-kv-on-surface-variant font-medium">{k.packageTitle || "Unknown Package"}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isLifetimeKey(k) && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-mono uppercase tracking-wider text-[10px] px-3 py-1">
                          ∞ Lifetime
                        </Badge>
                      )}
                      <Badge variant={statusVariant(k.status)} className="font-mono uppercase tracking-wider text-[10px] px-3 py-1">
                        {k.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 border-t border-kv-outline-variant/10 pt-6">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70">Hardware ID</div>
                      <div className="flex items-center gap-2 text-kv-on-surface">
                        <Cpu className="h-4 w-4 text-kv-on-surface-variant/70 shrink-0" />
                        <span className="font-mono text-sm truncate">{k.hwid || "Tidak terikat"}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70">Masa Berlaku</div>
                      <div className="text-sm font-medium text-kv-on-surface">
                        {isLifetimeKey(k) ? (
                          <span className="text-amber-400 font-bold">♾️ Selamanya</span>
                        ) : (
                          formatDateId(k.expiresAt)
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action footer */}
                {isActive && (
                  <div className="bg-[#12121A]/50 border-t border-kv-outline-variant/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {!hasHwid ? (
                      <span className="text-xs font-mono text-kv-on-surface-variant/70 uppercase tracking-widest">Waiting for device link...</span>
                    ) : !canReset ? (
                      <span className="inline-flex items-center gap-2 text-xs font-mono text-kv-on-surface-variant">
                        <Clock className="h-4 w-4 text-amber-400" />
                        Cooldown: <span className="text-amber-400 font-bold">{formatRemaining(msLeft)}</span>
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Ready to reset</span>
                        <Button
                          size="sm"
                          className="w-full sm:w-auto h-9 gap-2 text-xs bg-kv-surface border border-kv-outline-variant/20 hover:bg-kv-primary/10 hover:text-kv-primary hover:border-kv-primary/40 transition-all text-kv-on-surface"
                          onClick={() => {
                            setResetTargetKey(k);
                            setResetDialogOpen(true);
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset HWID
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
