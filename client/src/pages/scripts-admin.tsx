import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  TerminalSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Script } from "@shared/schema";

const defaultForm = {
  name: "",
  content: "",
};

export default function ScriptsAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Script | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery<{ data: Script[]; total: number }>({
    queryKey: ["/api/scripts", page],
    queryFn: async () => {
      return apiRequest("GET", `/api/scripts?limit=${pageSize}&page=${page}`);
    },
  });
  
  const items = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const createMutation = useMutation({
    mutationFn: (data: typeof defaultForm) =>
      apiRequest("POST", "/api/scripts", data),
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Script berhasil ditambahkan" });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof defaultForm & { id: number }) =>
      apiRequest("PUT", `/api/scripts/${data.id}`, data),
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Script berhasil diupdate" });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scripts/${id}`),
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Script berhasil dihapus" });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal hapus",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = () => {
    if (!form.name || !form.content) {
      return toast({
        title: "Validasi",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
    }

    if (editing) {
      updateMutation.mutate({ ...form, id: editing.id });
    } else {
      createMutation.mutate(form);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (item: Script) => {
    setEditing(item);
    setForm({
      name: item.name,
      content: item.content,
    });
    setDialogOpen(true);
  };
  
  const handleCopyLink = (name: string) => {
    const url = `${window.location.origin}/raw/${name}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL Tercopy",
      description: "URL raw script telah dicopy ke clipboard",
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Script Hosting</h2>
          <p className="text-muted-foreground mt-2">
            Kelola file script yang dapat dipanggil langsung dari eksekutor Roblox.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Script
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Script</CardTitle>
          <CardDescription>
            {total} script tersimpan di database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-[1fr_2fr_150px] items-center p-4 font-medium border-b bg-muted/50">
              <div>Nama Script</div>
              <div>Raw URL (Loadstring)</div>
              <div className="text-right">Aksi</div>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Memuat data...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <TerminalSquare className="mx-auto h-12 w-12 opacity-20 mb-3" />
                <p>Belum ada script yang ditambahkan.</p>
              </div>
            ) : (
              <div className="divide-y">
                {items.map((item) => {
                  const rawUrl = `${window.location.origin}/raw/${item.name}`;
                  const loadstring = `loadstring(game:HttpGet('${rawUrl}'))()`;
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_2fr_150px] items-center p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-mono text-sm">{item.name}</div>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[80%]">
                          {loadstring}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(loadstring);
                            toast({ title: "Loadstring disalin!" });
                          }}
                          title="Copy Loadstring"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-4 text-sm font-medium">
                      Halaman {page} dari {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Script" : "Tambah Script Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label>Nama Script (Untuk URL)</Label>
              <Input
                placeholder="contoh: main-script"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
              />
              <p className="text-xs text-muted-foreground">
                Hanya huruf, angka, strip (-), dan underscore (_). Akan jadi URL: /raw/nama-script
              </p>
            </div>

            <div className="space-y-2 h-full flex flex-col min-h-[300px]">
              <Label>Isi Script (Lua Code)</Label>
              <Textarea
                placeholder="print('Hello World')"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="font-mono text-sm flex-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Script yang terhapus tidak bisa diakses lagi oleh user dan eksekutor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteId !== null) {
                  deleteMutation.mutate(deleteId);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
