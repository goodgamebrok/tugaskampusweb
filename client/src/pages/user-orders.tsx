"use client"

import { useMemo } from "react";
import { Loader2, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatRupiah } from "@/lib/currency";
import { useUserAuth } from "@/lib/user-auth";

type UserOrderRow = {
  id: string;
  packageTitle: string | null;
  price: string;
  status: string;
  createdAt: string;
};

function formatDateTimeId(value: string | null) {
  if (!value) return "\u2014";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusConfig(status: string) {
  switch (status) {
    case "paid": return { label: "Lunas", variant: "default" as const, icon: CheckCircle, color: "text-emerald-400" };
    case "pending": return { label: "Menunggu", variant: "secondary" as const, icon: Clock, color: "text-amber-400" };
    case "expired": return { label: "Expired", variant: "outline" as const, icon: XCircle, color: "text-kv-on-surface-variant" };
    default: return { label: status, variant: "outline" as const, icon: FileText, color: "text-kv-on-surface-variant" };
  }
}

export function UserOrders() {
  const { toast } = useToast();
  const { token } = useUserAuth();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const { data, isLoading } = useQuery<{ orders: UserOrderRow[] }>({
    queryKey: ["/api/user/orders"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/user/orders", { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal ambil orders");
      return json;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/user/orders/${encodeURIComponent(orderId)}/confirm`, {
        method: "POST",
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal cek status pembayaran");
      return json as { id: string; status: string; gateway?: { ok: boolean; message?: string } };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
      toast({ title: "Status diperbarui", description: result.gateway?.message || result.status });
    },
    onError: (e: unknown) => {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Terjadi error", variant: "destructive" });
    },
  });

  const orders = data?.orders || [];
  const totals = useMemo(() => {
    return {
      pending: orders.filter((o) => o.status === "pending").length,
      paid: orders.filter((o) => o.status === "paid").length,
      expired: orders.filter((o) => o.status === "expired").length,
    };
  }, [orders]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-headline-lg text-2xl text-kv-on-surface font-bold tracking-tight">Riwayat Order</h1>
        <p className="text-sm text-kv-on-surface-variant mt-1">Semua transaksi pembelian kamu.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-5 transition-colors hover:border-amber-400/30">
          <div className="flex items-center gap-2 text-kv-on-surface-variant mb-3">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-medium uppercase tracking-widest font-mono">Pending</span>
          </div>
          <div className="font-headline-lg text-3xl font-bold tabular-nums text-amber-400">{totals.pending}</div>
        </div>
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-5 transition-colors hover:border-emerald-400/30">
          <div className="flex items-center gap-2 text-kv-on-surface-variant mb-3">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-medium uppercase tracking-widest font-mono">Lunas</span>
          </div>
          <div className="font-headline-lg text-3xl font-bold tabular-nums text-emerald-400">{totals.paid}</div>
        </div>
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-5 transition-colors hover:border-kv-outline-variant/40">
          <div className="flex items-center gap-2 text-kv-on-surface-variant mb-3">
            <XCircle className="h-4 w-4 text-kv-on-surface-variant/70" />
            <span className="text-[11px] font-medium uppercase tracking-widest font-mono">Expired</span>
          </div>
          <div className="font-headline-lg text-3xl font-bold tabular-nums text-kv-on-surface">{totals.expired}</div>
        </div>
      </div>

      {/* Order List */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-kv-on-surface-variant">
          <Loader2 className="h-6 w-6 animate-spin text-kv-primary" />
          <span className="text-sm font-medium">Memuat data...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-12 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-kv-primary/10 p-5 mb-5 ring-4 ring-kv-primary/5">
            <FileText className="h-8 w-8 text-kv-primary" />
          </div>
          <p className="text-lg font-headline-lg font-semibold text-kv-on-surface">Belum Ada Order</p>
          <p className="text-sm text-kv-on-surface-variant mt-2 max-w-sm">Pembelian paket akan tercatat di sini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const cfg = statusConfig(o.status);
            const StatusIcon = cfg.icon;
            return (
              <div key={o.id} className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 overflow-hidden transition-all duration-300 hover:border-kv-primary/40 hover:shadow-lg hover:shadow-kv-primary/5">
                <div className="p-6">
                  {/* Top row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-kv-on-surface">{o.packageTitle || "\u2014"}</div>
                      <div className="text-xs text-kv-on-surface-variant/60 font-mono truncate">{o.id}</div>
                    </div>
                    <Badge variant={cfg.variant} className="shrink-0 font-mono uppercase tracking-wider text-[10px] px-3 py-1 gap-1.5">
                      <StatusIcon className={`h-3 w-3 ${cfg.color}`} />
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 border-t border-kv-outline-variant/10 pt-6">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70">Harga</div>
                      <div className="text-lg font-bold text-kv-primary">{formatRupiah(o.price)}</div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70">Tanggal</div>
                      <div className="text-sm font-medium text-kv-on-surface">{formatDateTimeId(o.createdAt)}</div>
                    </div>
                  </div>
                </div>

                {/* Action footer for pending */}
                {o.status === "pending" && (
                  <div className="bg-[#12121A]/50 border-t border-kv-outline-variant/10 px-6 py-4">
                    <Button
                      size="sm"
                      className="w-full h-9 gap-2 text-xs bg-kv-surface border border-kv-outline-variant/20 hover:bg-kv-primary/10 hover:text-kv-primary hover:border-kv-primary/40 transition-all text-kv-on-surface"
                      onClick={() => confirmMutation.mutate(o.id)}
                      disabled={confirmMutation.isPending}
                    >
                      {confirmMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Cek Status Pembayaran
                    </Button>
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
