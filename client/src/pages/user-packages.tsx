"use client"

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShoppingCart, Info, Package as PackageIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatRupiah } from "@/lib/currency";
import { useUserAuth } from "@/lib/user-auth";
import type { Package } from "@shared/schema";

type UserOrderRow = {
  id: string;
  packageTitle: string | null;
  price: string;
  status: string;
  createdAt: string;
  payment: {
    provider: string;
    orderId: string | null;
    linkCode: string | null;
    url: string | null;
    qrString?: string | null;
    originalAmount?: number | null;
    totalAmount?: number | null;
    uniqueNominal?: number | null;
    expiresAt: string | null;
  } | null;
};

type CreatedOrder = {
  orderId: string;
  status: string;
  package: {
    id: number;
    title: string;
    durationDays: number;
    price: string;
    buyLink: string;
  };
  payment: {
    provider: string;
    orderId: string | null;
    linkCode: string | null;
    url: string | null;
    qrString?: string | null;
    originalAmount?: number | null;
    totalAmount?: number | null;
    uniqueNominal?: number | null;
    expiresAt: string | null;
    error?: string;
  } | null;
};

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

function formatDateTimeId(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserPackages() {
  const { toast } = useToast();
  const { token } = useUserAuth();
  const [activeOrder, setActiveOrder] = useState<CreatedOrder | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [paymentLinkRequestedFor, setPaymentLinkRequestedFor] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
    queryFn: async () => {
      const res = await fetch("/api/packages");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: ordersData } = useQuery<{ orders: UserOrderRow[] }>({
    queryKey: ["/api/user/orders"],
    enabled: !!token,
    refetchInterval: paymentDialogOpen ? 5000 : false,
    queryFn: async () => {
      const res = await fetch("/api/user/orders", { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal ambil orders");
      return data;
    },
  });

  const latestActionableOrder = useMemo(() => {
    const orders = ordersData?.orders || [];
    return orders.find((o) => o.status === "waiting_verification") || orders.find((o) => o.status === "pending") || null;
  }, [ordersData?.orders]);

  const activeOrderRow = useMemo(() => {
    if (!activeOrder?.orderId) return null;
    const orders = ordersData?.orders || [];
    return orders.find((o) => o.id === activeOrder.orderId) || null;
  }, [activeOrder?.orderId, ordersData?.orders]);

  const currentOrderId = activeOrder?.orderId || latestActionableOrder?.id || null;
  const currentStatus = activeOrderRow?.status || activeOrder?.status || latestActionableOrder?.status || null;
  const currentPayment = activeOrderRow?.payment || activeOrder?.payment || latestActionableOrder?.payment || null;
  const currentQrString = currentPayment?.qrString || "";
  const currentTotalAmount = currentPayment?.totalAmount ?? null;
  const currentExpiresAt = currentPayment?.expiresAt || null;
  const qrImageUrl = currentQrString
    ? `https://larabert-qrgen.hf.space/v1/create-qr-code?size=560x560&style=0&color=000000&data=${encodeURIComponent(currentQrString)}`
    : "";

  const buyMutation = useMutation({
    mutationFn: async (packageId: number) => {
      const res = await fetch("/api/user/orders", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat order");
      return data as CreatedOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
      setActiveOrder(data);
      setPaymentDialogOpen(true);
      if (data.payment && "error" in data.payment && data.payment.error) {
        toast({ title: "Order dibuat, tapi QRIS gagal", description: data.payment.error, variant: "destructive" });
      } else {
        toast({ title: "Order dibuat", description: "Silakan bayar via QRIS." });
      }
    },
    onError: (e: unknown) => {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Terjadi error", variant: "destructive" });
    },
  });

  const paymentLinkMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/user/orders/${encodeURIComponent(orderId)}/payment-link`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat QRIS");
      return data as { orderId: string; status: string; payment: CreatedOrder["payment"] };
    },
    onSuccess: (data) => {
      setActiveOrder((prev) => (prev && prev.orderId === data.orderId ? { ...prev, payment: data.payment } : prev));
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
      setPaymentDialogOpen(true);
      toast({ title: "QRIS siap", description: "Scan QR dan bayar sesuai nominal." });
    },
    onError: (e: unknown) => {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Terjadi error", variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (params: { orderId: string; silent?: boolean }) => {
      const res = await fetch(`/api/user/orders/${encodeURIComponent(params.orderId)}/confirm`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal cek status pembayaran");
      return data as { id: string; status: string; gateway?: { ok: boolean; message?: string; remoteStatus?: string } };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
      setActiveOrder((prev) => (prev && prev.orderId === data.id ? { ...prev, status: data.status } : prev));
      if (!variables?.silent) {
        if (data.status === "paid") toast({ title: "Pembayaran berhasil", description: "Key otomatis masuk di Dashboard." });
        else toast({ title: "Status", description: data.gateway?.message || data.status });
      }
    },
    onError: (e: unknown) => {
      if (String(e).includes("not authorized")) return;
      toast({ title: "Error", description: e instanceof Error ? e.message : "Terjadi error", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/user/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membatalkan order");
      return data as { id: string; status: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
      setActiveOrder(null);
      setPaymentLinkRequestedFor(null);
      setPaymentDialogOpen(false);
      toast({ title: "Order dibatalkan" });
    },
    onError: (e: unknown) => {
      toast({ title: "Gagal batalkan order", description: e instanceof Error ? e.message : "Terjadi error", variant: "destructive" });
    },
  });

  useEffect(() => {
    const orderId = activeOrder?.orderId;
    if (!orderId) return;
    if (activeOrder.status !== "pending") return;
    const hasPayment = !!activeOrder.payment?.qrString || !!activeOrder.payment?.url;
    if (hasPayment) return;
    if (paymentLinkRequestedFor === orderId) return;
    setPaymentLinkRequestedFor(orderId);
    paymentLinkMutation.mutate(orderId);
  }, [activeOrder?.orderId, activeOrder?.status, activeOrder?.payment?.qrString, activeOrder?.payment?.url, paymentLinkRequestedFor, paymentLinkMutation]);

  useEffect(() => {
    if (!paymentDialogOpen) return;
    if (!currentExpiresAt) {
      setRemainingMs(null);
      return;
    }
    const tick = () => setRemainingMs(new Date(currentExpiresAt).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [paymentDialogOpen, currentExpiresAt]);

  useEffect(() => {
    if (!paymentDialogOpen) {
      setPaymentSuccess(false);
      return;
    }
    if (currentStatus !== "paid" && currentStatus !== "waiting_verification") return;
    setPaymentSuccess(true);
    const t = setTimeout(() => {
      setPaymentDialogOpen(false);
      setPaymentSuccess(false);
      setActiveOrder(null);
      setPaymentLinkRequestedFor(null);
      queryClient.invalidateQueries({ queryKey: ["/api/user/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
    }, 900);
    return () => clearTimeout(t);
  }, [currentStatus, paymentDialogOpen]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline-lg text-2xl text-kv-on-surface font-bold tracking-tight">Store</h1>
        <p className="text-sm text-kv-on-surface-variant mt-1">Pilih paket, bayar via QRIS, key otomatis aktif.</p>
      </div>

      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) setPaymentSuccess(false);
        }}
      >
        <DialogContent className="max-w-md overflow-hidden p-0 border-kv-outline-variant/30 bg-kv-background">
          <div className="border-b border-kv-outline-variant/10 bg-gradient-to-r from-kv-primary/15 via-kv-background to-amber-500/10 p-6">
            <DialogHeader>
              <DialogTitle className="text-kv-on-surface font-headline-lg">Pembayaran QRIS</DialogTitle>
              <DialogDescription className="text-kv-on-surface-variant">Scan QR, lalu bayar sesuai nominal.</DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant">Total bayar</div>
                <div className="mt-1 text-3xl font-bold font-mono text-kv-on-surface">{formatRupiah(currentTotalAmount ?? 0)}</div>
              </div>
              {currentStatus ? (
                <Badge variant={currentStatus === "paid" ? "default" : currentStatus === "pending" ? "secondary" : "outline"} className="font-mono uppercase tracking-wider text-[10px] px-3 py-1">
                  {currentStatus === "pending"
                    ? "Menunggu"
                    : currentStatus === "waiting_verification"
                      ? "Terdeteksi"
                      : currentStatus}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="relative p-6 bg-kv-surface/30">
            {paymentSuccess ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center data-[state=open]:animate-in">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <div className="absolute h-24 w-24 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="absolute h-24 w-24 rounded-full bg-emerald-500/10" />
                  <CheckCircle2 className="relative h-14 w-14 text-emerald-400" />
                </div>
                <div className="text-xl font-headline-lg font-bold text-emerald-400">
                  {currentStatus === "waiting_verification" ? "Pembayaran terdeteksi" : "Pembayaran berhasil"}
                </div>
                <div className="text-sm text-kv-on-surface-variant font-mono">Menutup otomatis...</div>
              </div>
            ) : (
              <>
                <div className="relative overflow-hidden rounded-2xl border border-kv-outline-variant/20 bg-white p-4 shadow-sm">
                  {qrImageUrl ? (
                    <a href={qrImageUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl z-10 backdrop-blur-sm">
                        <span className="text-white font-mono text-xs uppercase tracking-widest">Buka di Tab Baru</span>
                      </div>
                      <img src={qrImageUrl} alt="QRIS" className="qris-img mx-auto h-72 w-72 object-contain" style={{ imageRendering: 'pixelated', background: 'white' }} />
                    </a>
                  ) : (
                    <div className="flex h-72 items-center justify-center text-sm font-mono text-kv-on-surface-variant/70">
                      {paymentLinkMutation.isPending ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-6 w-6 animate-spin text-kv-primary" />
                          <span>Menyiapkan QRIS...</span>
                        </div>
                      ) : (
                        "QRIS belum tersedia"
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 px-2">
                  <div className="text-[10px] uppercase tracking-widest font-mono text-kv-on-surface-variant/70">
                    Sisa waktu: <span className="font-bold text-amber-400">{remainingMs === null ? "—" : formatRemaining(remainingMs)}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-mono text-kv-on-surface-variant/70">
                    {currentExpiresAt ? formatDateTimeId(currentExpiresAt) : "—"}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <Button
                    size="sm"
                    className="bg-kv-surface border border-kv-outline-variant/30 hover:bg-kv-primary/10 hover:text-kv-primary text-kv-on-surface-variant transition-colors"
                    onClick={() => currentOrderId && confirmMutation.mutate({ orderId: currentOrderId })}
                    disabled={!currentOrderId || currentStatus !== "pending" || confirmMutation.isPending}
                  >
                    {confirmMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Cek Status
                  </Button>
                  <Button
                    size="sm"
                    className="bg-kv-surface border border-kv-outline-variant/30 hover:bg-kv-primary/10 hover:text-kv-primary text-kv-on-surface-variant transition-colors"
                    onClick={() => currentOrderId && paymentLinkMutation.mutate(currentOrderId)}
                    disabled={!currentOrderId || paymentLinkMutation.isPending}
                  >
                    {paymentLinkMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Refresh QR
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPaymentDialogOpen(false)}>Tutup</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div>
        {/* Active order banner */}
        {currentOrderId && currentStatus ? (
          <div className="mb-6 rounded-2xl border border-kv-outline-variant/30 bg-kv-primary/5 p-5 space-y-4 shadow-lg shadow-kv-primary/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-kv-primary mb-1">
                  <Info className="h-3.5 w-3.5" /> Order Aktif
                </div>
                <div className="font-mono text-sm font-bold text-kv-on-surface truncate">{currentOrderId}</div>
              </div>
              <Badge variant={currentStatus === "paid" ? "default" : currentStatus === "pending" ? "secondary" : "outline"} className="font-mono uppercase tracking-wider text-[10px] px-3 py-1.5">{currentStatus}</Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)} disabled={!currentOrderId} className="flex-1 sm:flex-none bg-kv-primary text-kv-on-primary hover:bg-kv-primary/90 rounded-full px-6">
                Lanjutkan Pembayaran
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none bg-kv-surface border border-kv-outline-variant/30 hover:bg-kv-primary/10 hover:text-kv-primary text-kv-on-surface transition-colors rounded-full px-6" onClick={() => currentOrderId && paymentLinkMutation.mutate(currentOrderId)} disabled={!currentOrderId || paymentLinkMutation.isPending}>
                {paymentLinkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh QR
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none bg-kv-surface border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors rounded-full px-6"
                onClick={() => currentOrderId && cancelMutation.mutate(currentOrderId)}
                disabled={!currentOrderId || currentStatus !== "pending" || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Batalkan Order
              </Button>
            </div>
          </div>
        ) : null}

        {packages.length === 0 ? (
          <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-12 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-kv-primary/10 p-5 mb-5 ring-4 ring-kv-primary/5">
              <ShoppingCart className="h-8 w-8 text-kv-primary" />
            </div>
            <p className="text-lg font-headline-lg font-semibold text-kv-on-surface">Belum ada paket</p>
            <p className="text-sm text-kv-on-surface-variant mt-2 max-w-sm">Paket sedang tidak tersedia saat ini.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const price = Number(pkg.price ?? 0) || 0;
              const original = Number(pkg.originalPrice ?? 0) || 0;
              const hasDiscount = original > 0 && original > price;
              return (
                <div key={pkg.id} className="group kv-surface-card rounded-2xl border border-kv-outline-variant/20 overflow-hidden flex flex-col transition-all duration-300 hover:border-kv-primary/40 hover:shadow-xl hover:shadow-kv-primary/10 relative">
                  {/* Popular badge floating */}
                  {pkg.isPopular ? (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-kv-primary text-kv-on-primary font-mono uppercase tracking-widest text-[9px] px-3 py-1 shadow-lg shadow-kv-primary/30">
                        Popular
                      </Badge>
                    </div>
                  ) : null}
                  
                  {/* Package image */}
                  {pkg.imageUrl ? (
                    <div className="aspect-[16/9] overflow-hidden bg-[#12121A] relative border-b border-kv-outline-variant/10">
                      <div className="absolute inset-0 bg-gradient-to-t from-kv-surface to-transparent opacity-80 z-10" />
                      <img src={pkg.imageUrl} alt={pkg.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-kv-primary/5 via-[#12121A] to-kv-secondary/5 relative border-b border-kv-outline-variant/10">
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <PackageIcon className="h-16 w-16 text-kv-on-surface" />
                      </div>
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col relative z-20 -mt-8">
                    <div className="space-y-1">
                      <h3 className="font-headline-lg text-xl font-bold text-kv-on-surface drop-shadow-md">{pkg.title}</h3>
                      <div className="text-[11px] font-mono uppercase tracking-widest text-kv-primary font-medium">{pkg.durationDays} hari akses</div>
                    </div>
                    
                    <div className="mt-8 mb-6 flex-1">
                      {hasDiscount ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-mono text-kv-on-surface-variant/60 line-through tracking-wider">{formatRupiah(original)}</span>
                          <span className="text-3xl font-bold text-kv-primary font-mono tracking-tight">{formatRupiah(price)}</span>
                        </div>
                      ) : (
                        <div className="text-3xl font-bold text-kv-primary font-mono tracking-tight mt-5">{formatRupiah(price)}</div>
                      )}
                    </div>
                    
                    <Button
                      className="w-full h-11 bg-kv-on-surface text-kv-surface hover:bg-kv-primary hover:text-kv-on-primary rounded-xl font-semibold transition-all duration-300"
                      onClick={() => buyMutation.mutate(pkg.id)}
                      disabled={
                        !token ||
                        buyMutation.isPending ||
                        (!!currentOrderId && currentStatus === "pending")
                      }
                    >
                      {buyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {buyMutation.isPending ? "Memproses..." : "Beli Paket"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
