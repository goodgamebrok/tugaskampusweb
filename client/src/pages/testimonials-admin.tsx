"use client"

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Loader2, Trash2, Star, CheckCircle2, XCircle, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AdminTestimonial = {
  id: number;
  userId: string;
  message: string;
  rating: number;
  status: string;
  sortOrder: number;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
  };
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Disetujui</Badge>;
    case "rejected":
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Ditolak</Badge>;
    default:
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Menunggu</Badge>;
  }
}

export default function TestimonialsAdmin() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const pageSize = 10;
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<{ items: AdminTestimonial[]; total: number }>({
    queryKey: ["/api/admin/testimonials", page, statusFilter],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const res = await apiRequest("GET", `/api/admin/testimonials?limit=${pageSize}&offset=${offset}&status=${statusFilter}`);
      return res;
    },
  });
  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/admin/testimonials/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      toast({ title: "Status diperbarui" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/testimonials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      setDeleteId(null);
      toast({ title: "Testimoni dihapus" });
    },
    onError: (e: Error) => toast({ title: "Gagal hapus", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-wide">Testimonials</h1>
          <p className="text-muted-foreground">Kelola review dari pengguna. Setujui agar muncul di Landing Page.</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Daftar Review</CardTitle>
          <CardDescription>{total} item</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{(error as Error).message}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada review dari pengguna.</div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((t) => (
                  <div key={t.id} className="flex flex-col gap-3 rounded-xl border bg-background/60 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Avatar */}
                        {t.user?.avatarUrl ? (
                          <img src={t.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {t.user?.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="font-semibold">{t.user?.username || "Unknown"}</div>
                        <Stars rating={Number(t.rating || 5)} />
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.user?.email}</div>
                      <div className="mt-3 text-sm text-muted-foreground">{t.message}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 flex-wrap">
                      {t.status !== "approved" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => approveMutation.mutate({ id: t.id, status: "approved" })}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Setujui
                        </Button>
                      )}
                      {t.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => approveMutation.mutate({ id: t.id, status: "rejected" })}
                          disabled={approveMutation.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                          Tolak
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => setDeleteId(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                          className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 5) p = i + 1;
                        else if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(p); }} isActive={page === p}>
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                          className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Testimoni?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tindakan ini tidak bisa dibatalkan.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteMutation.isPending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
