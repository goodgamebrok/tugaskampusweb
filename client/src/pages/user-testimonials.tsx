"use client"

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Send, Trash2, Clock, CheckCircle2, XCircle, MessageSquarePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("userToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Testimonial = {
  id: number;
  userId: string;
  message: string;
  rating: number;
  status: string;
  createdAt: string;
};

export function UserTestimonials() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ["/api/user/testimonials"],
    queryFn: async () => {
      const res = await fetch("/api/user/testimonials", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ message, rating }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gagal mengirim");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/testimonials"] });
      setMessage("");
      setRating(5);
      toast({ title: "Berhasil!", description: "Review kamu sudah dikirim dan sedang menunggu persetujuan admin." });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/user/testimonials/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/testimonials"] });
      toast({ title: "Dihapus", description: "Review berhasil dihapus." });
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-mono uppercase tracking-wider text-[10px] px-2.5 py-0.5 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Disetujui
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 font-mono uppercase tracking-wider text-[10px] px-2.5 py-0.5 gap-1">
            <XCircle className="w-3 h-3" /> Ditolak
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-mono uppercase tracking-wider text-[10px] px-2.5 py-0.5 gap-1">
            <Clock className="w-3 h-3" /> Menunggu
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-headline-lg text-2xl text-kv-on-surface font-bold tracking-tight">Review & Testimonial</h1>
        <p className="text-sm text-kv-on-surface-variant mt-1">Berikan review jujur tentang pengalaman kamu menggunakan King Vypers.</p>
      </div>

      {/* Form */}
      <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 overflow-hidden">
        <div className="px-6 py-5 border-b border-kv-outline-variant/10">
          <h2 className="flex items-center gap-2 font-headline-lg text-lg text-kv-on-surface font-semibold">
            <MessageSquarePlus className="h-5 w-5 text-kv-primary" />
            Tulis Review Baru
          </h2>
          <p className="text-sm text-kv-on-surface-variant mt-1">Review kamu akan tampil di halaman utama setelah disetujui oleh admin.</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Star Rating */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70 mb-3 block">Rating</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-125 active:scale-95"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-kv-outline-variant/30"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm font-mono text-kv-on-surface-variant">{rating}/5</span>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70 mb-3 block">Pesan</label>
            <Textarea
              placeholder="Ceritakan pengalamanmu menggunakan King Vypers... (min 10 karakter)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none bg-[#12121A]/50 border-kv-outline-variant/20 focus:border-kv-primary/50 text-kv-on-surface placeholder:text-kv-on-surface-variant/40 rounded-xl"
            />
            <p className="text-xs text-kv-on-surface-variant/50 mt-2 font-mono">{message.length} karakter</p>
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || message.trim().length < 10}
            className="w-full sm:w-auto h-10 gap-2 bg-kv-primary text-kv-on-primary hover:bg-kv-primary/90 rounded-full px-6 font-medium transition-all"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {createMutation.isPending ? "Mengirim..." : "Kirim Review"}
          </Button>
        </div>
      </div>

      {/* My Reviews */}
      <div>
        <h2 className="font-headline-lg text-lg text-kv-on-surface font-semibold mb-4">Review Saya</h2>
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-kv-on-surface-variant">
            <Loader2 className="h-5 w-5 animate-spin text-kv-primary" />
            <span className="text-sm">Memuat...</span>
          </div>
        ) : testimonials.length === 0 ? (
          <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-10 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-kv-primary/10 p-4 mb-4 ring-4 ring-kv-primary/5">
              <Star className="h-7 w-7 text-kv-primary" />
            </div>
            <p className="text-sm text-kv-on-surface-variant">Kamu belum pernah menulis review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonials.map((t) => (
              <div key={t.id} className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 p-6 transition-all duration-300 hover:border-kv-primary/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-4 h-4 ${s <= t.rating ? "fill-amber-400 text-amber-400" : "text-kv-outline-variant/20"}`} />
                        ))}
                      </div>
                      {statusBadge(t.status)}
                    </div>
                    <p className="text-sm text-kv-on-surface leading-relaxed">{t.message}</p>
                    <p className="text-xs text-kv-on-surface-variant/50 mt-3 font-mono">
                      {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    className="shrink-0 p-2 rounded-lg text-kv-on-surface-variant/50 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    onClick={() => {
                      if (confirm("Hapus review ini?")) deleteMutation.mutate(t.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
