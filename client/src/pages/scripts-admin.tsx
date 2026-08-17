import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  TerminalSquare,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  FolderPlus,
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
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Script } from "@shared/schema";

const defaultForm = {
  name: "",
  content: "",
  folder: "",
};

export default function ScriptsAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Script | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 100; // fetch all, group client-side
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<{ data: Script[]; total: number }>({
    queryKey: ["/api/scripts", page],
    queryFn: async () => {
      return apiRequest("GET", `/api/scripts?limit=${pageSize}&page=${page}`);
    },
  });

  const items = data?.data || [];
  const total = data?.total || 0;

  // Group by folder
  const grouped: Record<string, Script[]> = {};
  const rootScripts: Script[] = [];
  for (const item of items) {
    if (item.folder) {
      if (!grouped[item.folder]) grouped[item.folder] = [];
      grouped[item.folder].push(item);
    } else {
      rootScripts.push(item);
    }
  }
  const folderNames = Object.keys(grouped).sort();

  const toggleFolder = (name: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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

    const payload = {
      name: form.name,
      content: form.content,
      folder: form.folder.trim() || "",
    };

    if (editing) {
      updateMutation.mutate({ ...payload, id: editing.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openNew = (defaultFolder = "") => {
    setEditing(null);
    setForm({ ...defaultForm, folder: defaultFolder });
    setDialogOpen(true);
  };

  const openEdit = (item: Script) => {
    setEditing(item);
    setForm({
      name: item.name,
      content: item.content,
      folder: item.folder || "",
    });
    setDialogOpen(true);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const ScriptRow = ({ item }: { item: Script }) => {
    const rawUrl = `${window.location.origin}/raw/${item.name}`;
    const loadstring = `loadstring(game:HttpGet('${rawUrl}'))()`;
    return (
      <div className="grid grid-cols-[1fr_2fr_150px] items-center p-3 hover:bg-muted/50 transition-colors">
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
          <Button variant="outline" size="icon" onClick={() => openEdit(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={() => setDeleteId(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Script Hosting</h2>
          <p className="text-muted-foreground mt-2">
            Kelola file script yang dapat dipanggil langsung dari eksekutor Roblox.
          </p>
        </div>
        <Button onClick={() => openNew()}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Script
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Script</CardTitle>
          <CardDescription>
            {total} script tersimpan di database · {folderNames.length} folder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {/* Header */}
            <div className="grid grid-cols-[1fr_2fr_150px] items-center p-3 font-medium border-b bg-muted/50 text-sm">
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
              <div>
                {/* Folder Groups */}
                {folderNames.map((folderName) => {
                  const isCollapsed = collapsedFolders.has(folderName);
                  const folderScripts = grouped[folderName];
                  return (
                    <div key={folderName} className="border-b last:border-b-0">
                      {/* Folder Header Row */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors select-none"
                        onClick={() => toggleFolder(folderName)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        {isCollapsed ? (
                          <Folder className="h-4 w-4 text-yellow-400 shrink-0" />
                        ) : (
                          <FolderOpen className="h-4 w-4 text-yellow-400 shrink-0" />
                        )}
                        <span className="font-semibold text-sm">{folderName}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({folderScripts.length} script)
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto"
                          title={`Tambah script ke folder "${folderName}"`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openNew(folderName);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* Scripts in folder */}
                      {!isCollapsed && (
                        <div className="divide-y pl-6 border-l-2 border-yellow-400/30 ml-3">
                          {folderScripts.map((item) => (
                            <ScriptRow key={item.id} item={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Root scripts (no folder) */}
                {rootScripts.length > 0 && (
                  <div className={folderNames.length > 0 ? "border-t" : ""}>
                    {folderNames.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 text-xs text-muted-foreground">
                        <TerminalSquare className="h-3 w-3" />
                        <span>Tanpa Folder</span>
                      </div>
                    )}
                    <div className="divide-y">
                      {rootScripts.map((item) => (
                        <ScriptRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Script" : "Tambah Script Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Script (Untuk URL)</Label>
                <Input
                  placeholder="contoh: main-script"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Hanya huruf, angka, strip (-), underscore (_).
                </p>
              </div>
              <div className="space-y-2">
                <Label>
                  Folder{" "}
                  <span className="text-muted-foreground font-normal">(Opsional)</span>
                </Label>
                <div className="relative">
                  <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="contoh: Blox Fruits"
                    value={form.folder}
                    onChange={(e) => setForm({ ...form, folder: e.target.value })}
                    className="pl-9"
                    list="folder-suggestions"
                  />
                </div>
                <datalist id="folder-suggestions">
                  {folderNames.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Kosongkan jika tidak mau dimasukkan folder.
                </p>
              </div>
            </div>

            <div className="space-y-2 flex flex-col min-h-[300px]">
              <Label>Isi Script (Lua Code)</Label>
              <Textarea
                placeholder="print('Hello World')"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="font-mono text-sm flex-1 min-h-[280px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Delete */}
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
