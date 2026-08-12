import { useEffect, useState } from "react";
import { HeaderLogo } from "@/components/header-logo";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useUserAuth } from "@/lib/user-auth";
import { cn } from "@/lib/utils";

export default function UserLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, login } = useUserAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("userRememberMe") === "true";
  });

  useEffect(() => {
    const isRemembered = localStorage.getItem("userRememberMe") === "true";
    if (isRemembered) {
      const savedEmail = localStorage.getItem("userRememberedEmail");
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) setLocation("/dashboard");
  }, [isAuthenticated, setLocation]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      if (rememberMe) {
        localStorage.setItem("userRememberedEmail", email.trim());
        localStorage.setItem("userRememberMe", "true");
      } else {
        localStorage.removeItem("userRememberedEmail");
        localStorage.removeItem("userRememberMe");
      }
      toast({ title: "Login berhasil", description: "Selamat datang!" });
      setLocation("/dashboard");
    } catch (err: any) {
      if (err.code === "UNVERIFIED_EMAIL") {
        toast({ title: "Email belum diverifikasi", description: "Silakan verifikasi email Anda terlebih dahulu." });
        setLocation(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      } else {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Terjadi error",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased overflow-x-hidden selection:bg-kv-primary-container selection:text-kv-on-primary-container bg-kv-background text-kv-on-surface">
      {/* Atmospheric Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-kv-primary/10 rounded-full blur-[120px] opacity-50 transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-kv-secondary-container/10 rounded-full blur-[100px] opacity-40 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <main className="flex-grow flex items-center justify-center p-4 md:p-6 z-10 relative">
        <div className="w-full max-w-[480px] kv-surface-card rounded-xl p-8 md:p-10 relative overflow-hidden backdrop-blur-xl border border-kv-outline-variant/20 shadow-2xl">
          {/* Branding */}
          <div className="text-center mb-8">
            <Link href="/" className="flex items-center justify-center gap-2 mb-2 group cursor-pointer inline-flex">
              <HeaderLogo size="sm" className="rounded-lg" />
              <h1 className="font-sora text-kv-primary text-xl font-black uppercase tracking-tighter group-hover:opacity-80 transition-opacity">
                KING VYPERS
              </h1>
            </Link>
            <p className="font-mono text-kv-label text-kv-outline-variant uppercase tracking-widest">Premium Roblox Script</p>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-kv-on-surface mb-2">Selamat Datang Kembali</h2>
            <p className="text-kv-on-surface-variant font-sans text-sm">Masuk untuk melanjutkan ke dashboard.</p>
          </div>

          {/* Login Form */}
          <form onSubmit={submit} className="space-y-5">
            {/* Email Input */}
            <div className="bg-kv-surface-container-low border border-kv-surface-bright rounded-lg flex items-center px-4 py-3 group focus-within:border-kv-primary transition-all">
              <span className="material-symbols-outlined text-kv-on-surface-variant group-focus-within:text-kv-primary mr-3 text-[20px]">
                mail
              </span>
              <input
                className="w-full bg-transparent border-none p-0 text-kv-on-surface placeholder:text-kv-on-surface-variant focus:ring-0 focus:outline-none font-sans text-sm"
                placeholder="Email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="bg-kv-surface-container-low border border-kv-surface-bright rounded-lg flex items-center px-4 py-3 group relative focus-within:border-kv-primary transition-all">
              <span className="material-symbols-outlined text-kv-on-surface-variant group-focus-within:text-kv-primary mr-3 text-[20px]">
                lock
              </span>
              <input
                className="w-full bg-transparent border-none p-0 pr-10 text-kv-on-surface placeholder:text-kv-on-surface-variant focus:ring-0 focus:outline-none font-sans text-sm"
                placeholder="Password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                className="absolute right-4 text-kv-on-surface-variant hover:text-kv-primary transition-colors focus:outline-none"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center cursor-pointer group">
                <input
                  className="rounded border-kv-outline-variant bg-kv-surface-container text-kv-primary focus:ring-kv-primary focus:ring-offset-kv-surface"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="ml-2 text-sm text-kv-on-surface-variant group-hover:text-kv-on-surface transition-colors">
                  Ingat saya
                </span>
              </label>
              <Link className="text-sm text-kv-primary hover:text-kv-primary-container transition-colors font-medium" href="/forgot-password">
                Lupa password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              className="w-full kv-btn-primary text-white font-bold py-3 px-4 rounded-lg mt-6 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Masuk...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-kv-on-surface-variant">
              Belum punya akun?{" "}
              <Link href="/register" className="text-kv-primary font-medium hover:text-kv-primary-container hover:underline transition-all">
                Daftar di sini
              </Link>
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-kv-on-surface-variant hover:text-kv-on-surface transition-colors">
              &larr; Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
