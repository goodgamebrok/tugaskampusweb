import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Key,
  Loader2,
  LogOut,
  RotateCcw,
  ShoppingCart,
  Terminal,
  CheckCheck,
  Zap,
  TrendingUp,
  Shield,
} from "lucide-react";
import { HeaderLogo } from "@/components/header-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatRupiah } from "@/lib/currency";
import { useUserAuth } from "@/lib/user-auth";
import type { Package } from "@shared/schema";

type UserKeyRow = {
  id: number;
  keyCode: string;
  packageTitle: string | null;
  status: string;
  expiresAt: string | null;
  hwid?: string | null;
  hwidResetAt?: string | null;
  createdAt: string;
  loaderScript?: string | null;
};

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

function formatDateId(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Aktif", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    expired: { label: "Expired", className: "bg-red-500/15 text-red-400 border-red-500/30" },
    blacklisted: { label: "Banned", className: "bg-red-700/15 text-red-500 border-red-700/30" },
    unused: { label: "Unused", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
    available: { label: "Available", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
    sold: { label: "Terjual", className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
    pending: { label: "Pending", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    waiting_verification: { label: "Verifikasi", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    paid: { label: "Lunas", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    rejected: { label: "Ditolak", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  };
  const s = map[status] || { label: status, className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function CopyButton({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-background hover:text-foreground active:scale-95 ${size === "xs" ? "text-[10px] px-2 py-0.5" : ""}`}
    >
      {copied ? (
        <>
          <CheckCheck className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, token, user, logout } = useUserAuth();
  const [activeOrder, setActiveOrder] = useState<CreatedOrder | null>(null);
  const [paymentLinkRequestedFor, setPaymentLinkRequestedFor] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTargetKey, setResetTargetKey] = useState<UserKeyRow | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const { data: keysData, isLoading: keysLoading } = useQuery<{ keys: UserKeyRow[] }>({
    queryKey: ["/api/user/keys"],
    enabled: !!token,
    refetchInterval: activeOrder?.status === "waiting_verification" ? 5000 : activeOrder?.status === "pending" ? 5000 : false,
    queryFn: async () => {
      const res = await fetch("/api/user/keys", { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal ambil keys");
      return data;
    },
  });

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: UserOrderRow[] }>({
    queryKey: ["/api/user/orders"],
    enabled: !!token,
    refetchInterval: paymentDialogOpen ? 5000 : activeOrder?.status === "waiting_verification" ? 5000 : activeOrder?.status === "pending" ? 5000 : false,
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

  useEffect(() => {
    if (paymentDialogOpen && currentStatus === "paid" && !paymentSuccess) {
      setPaymentSuccess(true);
      toast({ title: "Pembayaran berhasil", description: "Key sudah otomatis masuk ke akun kamu." });
      queryClient.invalidateQueries({ queryKey: ["/api/user/keys"] });

      const timer = setTimeout(() => {
        setPaymentDialogOpen(false);
        setPaymentSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStatus, paymentDialogOpen, paymentSuccess, toast]);

  const myKeys = keysData?.keys || [];
  const keysActive = myKeys.filter((k) => k.status === "active").length;
  const keysExpired = myKeys.filter((k) => k.status === "expired").length;
  const keysResetReady = myKeys.filter((k) => {
    if (k.status !== "active") return false;
    if (!k.hwid) return false;
    if (!k.hwidResetAt) return true;
    const next = new Date(k.hwidResetAt).getTime() + 20 * 60 * 1000;
    return nowMs >= next;
  }).length;

  // Fetch current global loader script
  const { data: loaderData } = useQuery<{ loaderScript: string | null }>({
    queryKey: ["/api/loader-script"],
    queryFn: async () => {
      const res = await fetch("/api/loader-script");
      if (!res.ok) return { loaderScript: null };
      return res.json();
    },
  });
  const globalLoaderScript = loaderData?.loaderScript;
  // Show loader script if they have any valid key (sold or active)
  const hasValidKey = myKeys.some((k) => k.status === "active" || k.status === "sold");

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
    queryFn: async () => {
      const res = await fetch("/api/packages");
      if (!res.ok) return [];
      return res.json();
    },
  });

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
        toast({ title: "Order dibuat, tapi link pembayaran gagal", description: data.payment.error, variant: "destructive" });
      } else {
        toast({ title: "Order dibuat", description: "Popup pembayaran dibuka." });
      }
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
      if (!res.ok) throw new Error(data.message || "Gagal konfirmasi pembayaran");
      return data as {
        id: string;
        status: string;
        key?: { id: number; keyCode: string; status: string };
        gateway?: { ok: boolean; message?: string; remoteStatus?: string };
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
      if (data.status === "paid") {
        queryClient.invalidateQueries({ queryKey: ["/api/user/keys"] });
      }
      setActiveOrder((prev) => (prev && prev.orderId === data.id ? { ...prev, status: data.status } : prev));
      if (!variables?.silent) {
        if (data.status === "paid") {
          toast({ title: "Pembayaran berhasil", description: "Key sudah otomatis masuk ke akun kamu." });
        } else if (data.status === "waiting_verification") {
          toast({ title: "Pembayaran terdeteksi", description: "Menunggu verifikasi admin." });
        } else if (data.status === "expired") {
          toast({ title: "Transaksi expired", description: "Klik 'Buat Ulang QR' untuk buat transaksi baru.", variant: "destructive" });
        } else if (data.status === "rejected") {
          toast({ title: "Transaksi dibatalkan", description: "Klik 'Buat Ulang QR' untuk buat transaksi baru.", variant: "destructive" });
        } else {
          toast({ title: "Masih pending", description: data.gateway?.message || "Belum terdeteksi pembayaran." });
        }
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
      toast({ title: "QRIS siap", description: "Silakan scan QR dan bayar sesuai nominal." });
    },
    onError: (e: unknown) => {
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

  const resetHwidMutation = useMutation({
    mutationFn: async (key: UserKeyRow) => {
      const res = await fetch(`/api/user/keys/${key.id}/reset-hwid`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.status === 429) {
        const message = data.message || "Bisa reset lagi dalam 20 menit";
        throw new Error(message);
      }
      if (!res.ok) throw new Error(data.message || "Gagal reset HWID");
      return data as { success: boolean; message: string; resetAvailableAt?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/keys"] });
      toast({ title: "Berhasil", description: data.message || "HWID berhasil di-reset" });
      setResetDialogOpen(false);
      setResetTargetKey(null);
    },
    onError: (e: unknown) => {
      toast({ title: "Gagal reset", description: e instanceof Error ? e.message : "Terjadi error", variant: "destructive" });
    },
  });

  useEffect(() => {
    const orderId = activeOrder?.orderId;
    if (!orderId) return;
    const status = activeOrder.status;
    if (status !== "pending") return;
    const hasPayment = !!activeOrder.payment?.qrString || !!activeOrder.payment?.url;
    if (hasPayment) return;
    if (paymentLinkRequestedFor === orderId) return;
    setPaymentLinkRequestedFor(orderId);
    paymentLinkMutation.mutate(orderId);
  }, [activeOrder?.orderId, activeOrder?.status, activeOrder?.payment?.qrString, activeOrder?.payment?.url, paymentLinkRequestedFor, paymentLinkMutation]);

  useEffect(() => {
    if (!activeOrder) return;
    const orders = ordersData?.orders || [];
    const latest = orders.find((o) => o.id === activeOrder.orderId);
    if (!latest) return;
    if (latest.status === "paid") {
      if (!paymentDialogOpen) {
        setActiveOrder(null);
        setPaymentLinkRequestedFor(null);
      }
      return;
    }
    if (latest.status === "rejected") {
      setActiveOrder(null);
      setPaymentLinkRequestedFor(null);
    }
  }, [ordersData?.orders, activeOrder, paymentDialogOpen]);

  useEffect(() => {
    if (!paymentDialogOpen) return;
    if (!currentExpiresAt) {
      setRemainingMs(null);
      return;
    }
    const tick = () => {
      const ms = new Date(currentExpiresAt).getTime() - Date.now();
      setRemainingMs(ms);
    };
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
      queryClient.invalidateQueries({ queryKey: ["/api/user/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });
    }, 900);
    return () => clearTimeout(t);
  }, [currentStatus, paymentDialogOpen]);

  const doLogout = () => {
    logout();
    toast({ title: "Logout berhasil" });
    setLocation("/login");
  };

  const statsCards = [
    {
      label: "Total Key",
      value: myKeys.length,
      icon: Key,
      gradient: "from-violet-500/20 to-violet-500/5",
      iconColor: "text-violet-400",
    },
    {
      label: "Key Aktif",
      value: keysActive,
      sub: keysExpired ? `${keysExpired} expired` : null,
      icon: Zap,
      gradient: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-400",
    },
    {
      label: "Reset HWID Ready",
      value: keysResetReady,
      icon: RotateCcw,
      gradient: "from-sky-500/20 to-sky-500/5",
      iconColor: "text-sky-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background circuit-overlay">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-serif text-lg font-bold tracking-wide">
            <HeaderLogo size="sm" />
            King Vypers
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={doLogout}
            className="gap-2 border-border/60 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container px-4 py-8 md:py-12">
        <div className="mx-auto max-w-5xl space-y-7">

          {/* ── Welcome Banner ── */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-6 py-7">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(270_91%_66%/0.15),transparent_60%)]" />
            <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Dashboard</p>
                <h1 className="mt-1 font-serif text-2xl font-bold tracking-wide">
                  Selamat datang,{" "}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {user?.username ?? "User"}
                  </span>{" "}
                  👋
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{user?.email ?? "Memuat profile..."}</p>
              </div>
              <div className="mt-4 flex items-center gap-2 sm:mt-0">
                <Shield className="h-5 w-5 text-primary/60" />
                <span className="text-xs text-muted-foreground">King Vypers Member</span>
              </div>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid gap-4 sm:grid-cols-3">
            {statsCards.map((s) => (
              <Card key={s.label} className="glass relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-60`} />
                <CardContent className="relative pt-5 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
                    <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                  </div>
                  <div className="mt-3 text-3xl font-bold tabular-nums">{s.value}</div>
                  {s.sub && <div className="mt-1 text-[11px] text-muted-foreground">{s.sub}</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Loader Script Section ── */}
          {hasValidKey && globalLoaderScript && (
            <Card className="glass border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Terminal className="h-4 w-4 text-primary" />
                  Loader Script
                </CardTitle>
                <CardDescription>
                  Copy script di bawah dan paste di executor Roblox kamu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">Global Script</span>
                    </div>
                    <CopyButton text={globalLoaderScript} />
                  </div>
                  <div className="relative mt-1 overflow-hidden rounded-lg border border-border/40 bg-zinc-950/60">
                    <div className="flex items-center gap-1.5 border-b border-border/30 bg-zinc-900/40 px-3 py-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-500/70" />
                      <div className="h-2 w-2 rounded-full bg-amber-500/70" />
                      <div className="h-2 w-2 rounded-full bg-emerald-500/70" />
                      <span className="ml-1 text-[10px] text-zinc-500">script.lua</span>
                    </div>
                    <pre className="overflow-x-auto px-4 py-3 text-[11px] leading-relaxed text-emerald-300 scrollbar-thin">
                      <code>{globalLoaderScript}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Purchase Packages ── */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Purchase Packages
              </CardTitle>
              <CardDescription>
                Pilih paket, bayar via QRIS, dan key otomatis masuk setelah pembayaran terdeteksi.
              </CardDescription>
            </CardHeader>
            <CardContent>

              {/* Payment Dialog */}
              <Dialog
                open={paymentDialogOpen}
                onOpenChange={(open) => {
                  setPaymentDialogOpen(open);
                  if (!open) setPaymentSuccess(false);
                }}
              >
                <DialogContent className="max-w-md overflow-hidden p-0">
                  <div className="border-b bg-gradient-to-r from-primary/15 via-background to-orange-500/10 p-5">
                    <DialogHeader>
                      <DialogTitle>Pembayaran QRIS</DialogTitle>
                      <DialogDescription>Scan QR, lalu bayar sesuai nominal.</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Total bayar</div>
                        <div className="mt-1 text-2xl font-bold">{formatRupiah(currentTotalAmount ?? 0)}</div>
                      </div>
                      {currentStatus ? (
                        <StatusBadge status={currentStatus} />
                      ) : null}
                    </div>
                  </div>

                  <div className="relative p-5">
                    {paymentSuccess ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <div className="relative flex h-20 w-20 items-center justify-center">
                          <div className="absolute h-20 w-20 rounded-full bg-emerald-500/20 animate-ping" />
                          <div className="absolute h-20 w-20 rounded-full bg-emerald-500/10" />
                          <CheckCircle2 className="relative h-12 w-12 text-emerald-500" />
                        </div>
                        <div className="text-xl font-semibold">
                          {currentStatus === "waiting_verification" ? "Pembayaran terdeteksi" : "Pembayaran berhasil"}
                        </div>
                        <div className="text-sm text-muted-foreground">Menutup otomatis...</div>
                      </div>
                    ) : (
                      <>
                        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                          {qrImageUrl ? (
                            <a href={qrImageUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl z-10 backdrop-blur-sm">
                                <span className="text-white font-mono text-xs uppercase tracking-widest">Buka di Tab Baru</span>
                              </div>
                              <img
                                src={qrImageUrl}
                                alt="QRIS"
                                className="qris-img mx-auto h-72 w-72 object-contain"
                                style={{ imageRendering: 'pixelated', background: 'white' }}
                              />
                            </a>
                          ) : (
                            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                              {paymentLinkMutation.isPending ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Menyiapkan QRIS...
                                </div>
                              ) : (
                                "QRIS belum tersedia"
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="text-xs text-muted-foreground">
                            Sisa waktu:{" "}
                            <span className="font-mono">{remainingMs === null ? "—" : formatRemaining(remainingMs)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {currentExpiresAt ? formatDateTimeId(currentExpiresAt) : "—"}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => currentOrderId && confirmMutation.mutate({ orderId: currentOrderId })}
                            disabled={!currentOrderId || currentStatus !== "pending" || confirmMutation.isPending}
                          >
                            {confirmMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Cek Status
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPaymentDialogOpen(false)}>
                            Tutup
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Active Order Banner */}
              {(activeOrder || latestActionableOrder) ? (
                <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                    <Clock className="h-4 w-4" />
                    Order Aktif
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{currentOrderId}</span>
                    {currentStatus ? <StatusBadge status={currentStatus} /> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setPaymentDialogOpen(true)} disabled={!currentOrderId}>
                      Bayar Sekarang
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => currentOrderId && paymentLinkMutation.mutate(currentOrderId)}
                      disabled={!currentOrderId || paymentLinkMutation.isPending}
                    >
                      {paymentLinkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Buat Ulang QR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => currentOrderId && cancelMutation.mutate(currentOrderId)}
                      disabled={!currentOrderId || currentStatus !== "pending" || cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Batalkan
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Package Grid */}
              {packages.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Belum ada paket tersedia.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {packages.map((pkg) => {
                    const price = Number(pkg.price ?? 0) || 0;
                    const original = Number(pkg.originalPrice ?? 0) || 0;
                    const hasDiscount = original > 0 && original > price;
                    const features = [pkg.feature1, pkg.feature2, pkg.feature3, pkg.feature4].filter(Boolean);

                    return (
                      <div
                        key={pkg.id}
                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/60 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                      >
                        {pkg.isPopular ? (
                          <div className="absolute right-3 top-3 z-10">
                            <span className="rounded-full bg-gradient-to-r from-primary to-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                              Popular
                            </span>
                          </div>
                        ) : null}

                        {pkg.imageUrl ? (
                          <div className="overflow-hidden">
                            <img
                              src={pkg.imageUrl}
                              alt={pkg.title}
                              className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="h-32 w-full bg-gradient-to-br from-primary/20 via-background to-secondary/20 transition-opacity duration-300 group-hover:opacity-80" />
                        )}

                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div>
                            <div className="font-semibold">{pkg.title}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              {pkg.durationDays} hari akses
                            </div>
                          </div>

                          {features.length > 0 && (
                            <ul className="space-y-1">
                              {features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <CheckCheck className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-400" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="mt-auto pt-2">
                            <div className="flex items-end justify-between gap-2">
                              <div>
                                {hasDiscount && (
                                  <div className="text-xs text-muted-foreground line-through">{formatRupiah(original)}</div>
                                )}
                                <div className="text-xl font-bold">{formatRupiah(price)}</div>
                              </div>
                              <div className="rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                QRIS
                              </div>
                            </div>
                            <Button
                              className="mt-3 w-full"
                              size="sm"
                              onClick={() => buyMutation.mutate(pkg.id)}
                              disabled={
                                !token ||
                                buyMutation.isPending ||
                                (ordersData?.orders || []).some((o) => o.status === "pending")
                              }
                            >
                              {buyMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                              Beli Paket
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── My Keys ── */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                My Keys
              </CardTitle>
              <CardDescription>Daftar key yang kamu miliki</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Reset HWID Confirm Dialog */}
              <AlertDialog
                open={resetDialogOpen}
                onOpenChange={(open) => {
                  setResetDialogOpen(open);
                  if (!open) setResetTargetKey(null);
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset HWID</AlertDialogTitle>
                    <AlertDialogDescription>
                      Reset HWID akan melepas device yang terikat. Setelah reset, key bisa dipakai di device baru.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {resetTargetKey ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Key</span>
                        <span className="font-mono">{resetTargetKey.keyCode}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">HWID</span>
                        <span className="max-w-[220px] truncate font-mono text-xs">{resetTargetKey.hwid || "—"}</span>
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

              {keysLoading ? (
                <div className="flex items-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat keys...
                </div>
              ) : (keysData?.keys || []).length === 0 ? (
                <div className="py-10 text-center">
                  <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Belum ada key. Beli paket di atas untuk mendapatkan key.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/40">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Package</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HWID</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expired</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(keysData?.keys || []).map((k) => {
                        const isActive = k.status === "active";
                        const hasHwid = !!k.hwid;
                        const nextAllowedAt = k.hwidResetAt ? new Date(k.hwidResetAt).getTime() + 20 * 60 * 1000 : null;
                        const msLeft = nextAllowedAt ? nextAllowedAt - nowMs : 0;
                        const canReset = isActive && hasHwid && (!nextAllowedAt || msLeft <= 0);

                        return (
                          <TableRow key={k.id} className="border-border/30 transition-colors hover:bg-muted/10">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{k.keyCode}</span>
                                <CopyButton text={k.keyCode} size="xs" />
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{k.packageTitle || "—"}</TableCell>
                            <TableCell>
                              <StatusBadge status={k.status} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Cpu className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                <span className="max-w-[140px] truncate font-mono text-xs text-muted-foreground">
                                  {k.hwid || "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {!isActive ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : !hasHwid ? (
                                <span className="text-xs text-muted-foreground">Belum terikat</span>
                              ) : !canReset ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatRemaining(msLeft)}
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1.5 text-xs"
                                  onClick={() => {
                                    setResetTargetKey(k);
                                    setResetDialogOpen(true);
                                  }}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reset HWID
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDateId(k.expiresAt)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Order History ── */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Order History
              </CardTitle>
              <CardDescription>Riwayat order kamu</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat order...
                </div>
              ) : (ordersData?.orders || []).length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Belum ada order.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/40">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order ID</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Package</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Harga</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ordersData?.orders || []).map((o) => (
                        <TableRow key={o.id} className="border-border/30 transition-colors hover:bg-muted/10">
                          <TableCell>
                            <span className="max-w-[120px] truncate font-mono text-xs text-muted-foreground">
                              {o.id}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{o.packageTitle || "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{formatRupiah(o.price)}</TableCell>
                          <TableCell>
                            <StatusBadge status={o.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDateId(o.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
