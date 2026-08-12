"use client"

import { useState, useRef } from "react";
import { Loader2, Lock, Mail, User, LogOut, Camera, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserAuth } from "@/lib/user-auth";

export function UserAccount() {
  const { toast } = useToast();
  const { token, user, logout } = useUserAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload gagal");
      toast({ title: "Berhasil", description: "Foto profil berhasil diubah!" });
      // Reload user data
      window.location.reload();
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : "Upload gagal", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Password lama dan password baru wajib diisi", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password baru minimal 6 karakter", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Konfirmasi password tidak sama", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal ubah password");
      toast({ title: "Berhasil", description: data.message || "Password berhasil diubah" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast({ title: "Gagal", description: e instanceof Error ? e.message : "Terjadi error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-headline-lg text-2xl text-kv-on-surface font-bold tracking-tight">Akun Saya</h1>
        <p className="text-sm text-kv-on-surface-variant mt-1">Informasi profil dan pengaturan keamanan.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 overflow-hidden relative">
          
          <div className="px-6 py-5 border-b border-kv-outline-variant/10 relative z-10">
            <h2 className="flex items-center gap-2 font-headline-lg text-lg text-kv-on-surface font-semibold">
              <User className="h-5 w-5 text-kv-primary" />
              Profil User
            </h2>
          </div>
          
          <div className="p-6 space-y-6 relative z-10">
            {/* Avatar Upload */}
            <div className="flex items-center gap-5">
              <div className="relative group">

                <div className="relative">
                  {(user as any)?.avatarUrl ? (
                    <img src={(user as any).avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-kv-primary/30 bg-[#12121A]" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#12121A] ring-2 ring-kv-outline-variant/30 flex items-center justify-center text-2xl font-bold text-kv-primary shadow-inner">
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 text-kv-primary animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <div>
                <p className="text-lg font-headline-lg font-bold text-kv-on-surface">{user?.username}</p>
                <p className="text-[11px] font-mono text-kv-on-surface-variant/70 uppercase tracking-widest mt-1">Klik foto untuk mengganti</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-kv-outline-variant/10">
              <div className="flex items-center justify-between rounded-xl border border-kv-outline-variant/15 bg-[#12121A]/50 px-5 py-4">
                <div className="flex items-center gap-3 text-sm text-kv-on-surface-variant">
                  <div className="p-1.5 rounded-md bg-kv-surface border border-kv-outline-variant/20">
                    <User className="h-4 w-4 text-kv-primary" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest">Username</span>
                </div>
                <span className="font-mono text-sm font-bold text-kv-on-surface">{user?.username || "\u2014"}</span>
              </div>
              
              <div className="flex items-center justify-between rounded-xl border border-kv-outline-variant/15 bg-[#12121A]/50 px-5 py-4">
                <div className="flex items-center gap-3 text-sm text-kv-on-surface-variant">
                  <div className="p-1.5 rounded-md bg-kv-surface border border-kv-outline-variant/20">
                    <Mail className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest">Email</span>
                </div>
                <span className="font-mono text-sm font-medium text-kv-on-surface truncate max-w-[150px] sm:max-w-[180px]">{user?.email || "\u2014"}</span>
              </div>
            </div>

            {/* Mobile logout button */}
            <div className="md:hidden pt-4">
              <Button className="w-full h-11 gap-2 bg-kv-surface border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 rounded-xl transition-all" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Keluar dari Akun
              </Button>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="kv-surface-card rounded-2xl border border-kv-outline-variant/20 overflow-hidden relative">

          
          <div className="px-6 py-5 border-b border-kv-outline-variant/10 relative z-10">
            <h2 className="text-lg font-headline-lg font-semibold text-kv-on-surface flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              Ubah Keamanan
            </h2>
          </div>
          
          <div className="p-6 relative z-10">
            <form className="space-y-5" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70">Password Lama</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Masukkan password lama"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={saving}
                  className="h-11 bg-[#12121A]/50 border-kv-outline-variant/20 focus:border-kv-primary/50 text-kv-on-surface placeholder:text-kv-on-surface-variant/40 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving}
                  className="h-11 bg-[#12121A]/50 border-kv-outline-variant/20 focus:border-amber-400/50 text-kv-on-surface placeholder:text-kv-on-surface-variant/40 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[10px] font-mono uppercase tracking-widest text-kv-on-surface-variant/70">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving}
                  className="h-11 bg-[#12121A]/50 border-kv-outline-variant/20 focus:border-amber-400/50 text-kv-on-surface placeholder:text-kv-on-surface-variant/40 rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full h-11 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl font-medium transition-all mt-4" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Perbarui Password
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
