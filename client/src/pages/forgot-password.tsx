import { useState, useRef } from "react";
import { HeaderLogo } from "@/components/header-logo";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengirim kode");
      toast({ title: "Kode terkirim", description: data.message });
      setStep(2);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.some(c => !c)) {
      toast({ title: "Error", description: "Masukkan kode 6 digit", variant: "destructive" });
      return;
    }
    setStep(3);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.join(""), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mereset password");
      toast({ title: "Berhasil", description: "Password berhasil diubah" });
      setLocation("/user-login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculation mock
  const strengthScore = Math.min(4, Math.floor(newPassword.length / 3));
  const strengthLabels = ["Sangat Lemah", "Lemah", "Sedang", "Kuat", "Sangat Kuat"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-400", "bg-emerald-500"];

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased overflow-x-hidden selection:bg-kv-primary-container selection:text-kv-on-primary-container bg-kv-background text-kv-on-surface">
      {/* Atmospheric Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-kv-primary/10 rounded-full blur-[120px] opacity-50 transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-kv-secondary-container/10 rounded-full blur-[100px] opacity-40 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <main className="flex-grow flex items-center justify-center p-4 md:p-6 w-full max-w-container-max mx-auto relative z-10 my-16 mb-32">
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

          {/* Flow Step 1 */}
          {step === 1 && (
            <div className="block animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center mb-8">
                <h2 className="font-bold text-kv-on-surface mb-2 font-sora text-2xl">Lupa Password?</h2>
                <p className="text-kv-on-surface-variant text-sm font-sans">
                  Masukkan email kamu dan kami akan mengirimkan kode untuk mereset password.
                </p>
              </div>
              <form className="space-y-5" onSubmit={handleSendCode}>
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

                <button
                  className="w-full kv-btn-primary text-white font-bold py-3 px-4 rounded-lg mt-6 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      Mengirim...
                    </>
                  ) : (
                    "Kirim Kode"
                  )}
                </button>
              </form>
              <div className="mt-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="h-px bg-kv-outline-variant/30 flex-grow"></div>
                  <span className="font-mono text-[10px] text-kv-outline-variant uppercase">atau</span>
                  <div className="h-px bg-kv-outline-variant/30 flex-grow"></div>
                </div>
                <div className="text-center">
                  <Link href="/login" className="text-kv-primary hover:text-kv-primary-container transition-colors font-medium text-sm flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Kembali ke halaman login
                  </Link>
                </div>
              </div>
              <div className="mt-6 bg-kv-surface-container-low border border-kv-outline-variant/10 rounded-lg p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-kv-outline-variant text-[20px]">info</span>
                <p className="text-xs text-kv-outline-variant mt-0.5">
                  Pastikan email yang kamu masukkan sudah terdaftar di sistem kami untuk menerima kode pemulihan.
                </p>
              </div>
            </div>
          )}

          {/* Flow Step 2 */}
          {step === 2 && (
            <div className="block animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-8">
                <h2 className="font-bold text-kv-on-surface mb-2 font-sora text-2xl">Masukkan Kode</h2>
                <p className="text-kv-on-surface-variant text-sm mb-1">Kami telah mengirimkan kode reset password ke</p>
                <p className="text-kv-primary font-medium text-sm">{email}</p>
              </div>
              <form className="space-y-6" onSubmit={handleVerifyCode}>
                <div className="flex justify-between gap-2 md:gap-4 mb-4">
                  {code.map((v, i) => (
                    <input
                      key={i}
                      ref={codeRefs[i]}
                      value={v}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !code[i] && i > 0) {
                          codeRefs[i - 1].current?.focus();
                        }
                      }}
                      className="w-12 h-14 md:w-14 md:h-16 text-center text-xl font-bold bg-kv-surface-container-low border border-kv-surface-bright rounded-lg text-kv-on-surface focus:outline-none focus:ring-1 focus:ring-kv-primary focus:border-kv-primary transition-colors"
                      maxLength={1}
                      type="text"
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-kv-outline-variant mb-6">
                  Kode akan kadaluarsa dalam <span className="text-kv-primary font-medium">10:00</span>
                </p>
                <button
                  className="w-full kv-btn-primary text-white font-bold py-3 px-4 rounded-lg mt-6 flex justify-center items-center gap-2"
                  type="submit"
                >
                  Verifikasi Kode
                </button>
              </form>
              <div className="mt-6 text-center flex flex-col gap-3">
                <p className="text-sm text-kv-on-surface-variant">
                  Belum menerima code?{" "}
                  <button className="text-kv-primary hover:text-kv-primary-container transition-colors font-medium cursor-pointer bg-transparent border-none p-0" type="button" onClick={handleSendCode} disabled={loading}>
                    Kirim ulang
                  </button>
                </p>
                <button className="text-xs text-kv-outline-variant hover:text-kv-on-surface bg-transparent border-none p-0 cursor-pointer" onClick={() => setStep(1)}>
                  Ganti email
                </button>
              </div>
            </div>
          )}

          {/* Flow Step 3 */}
          {step === 3 && (
            <div className="block animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-8">
                <h2 className="font-bold text-kv-on-surface mb-2 font-sora text-2xl">Buat Password Baru</h2>
                <p className="text-kv-on-surface-variant text-sm">
                  Silakan buat password baru yang kuat dan mudah kamu ingat.
                </p>
              </div>
              <form className="space-y-5" onSubmit={handleSavePassword}>
                {/* Password Input */}
                <div className="bg-kv-surface-container-low border border-kv-surface-bright rounded-lg flex items-center px-4 py-3 group relative focus-within:border-kv-primary transition-all">
                  <span className="material-symbols-outlined text-kv-on-surface-variant group-focus-within:text-kv-primary mr-3 text-[20px]">
                    lock
                  </span>
                  <input
                    className="w-full bg-transparent border-none p-0 pr-10 text-kv-on-surface placeholder:text-kv-on-surface-variant focus:ring-0 focus:outline-none font-sans text-sm"
                    placeholder="Password Baru"
                    required
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

                {/* Confirm Password Input */}
                <div className="bg-kv-surface-container-low border border-kv-surface-bright rounded-lg flex items-center px-4 py-3 group relative focus-within:border-kv-primary transition-all">
                  <span className="material-symbols-outlined text-kv-on-surface-variant group-focus-within:text-kv-primary mr-3 text-[20px]">
                    lock
                  </span>
                  <input
                    className="w-full bg-transparent border-none p-0 pr-10 text-kv-on-surface placeholder:text-kv-on-surface-variant focus:ring-0 focus:outline-none font-sans text-sm"
                    placeholder="Konfirmasi Password"
                    required
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    className="absolute right-4 text-kv-on-surface-variant hover:text-kv-primary transition-colors focus:outline-none"
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirm ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-kv-outline-variant">Kekuatan Password:</span>
                      <span className={cn("font-medium", newPassword.length > 0 ? strengthColors[strengthScore].replace('bg-', 'text-') : "")}>
                        {strengthLabels[strengthScore]}
                      </span>
                    </div>
                    <div className="flex gap-1 h-1.5">
                      {[0, 1, 2, 3].map((s) => (
                        <div
                          key={s}
                          className={cn("w-1/4 rounded-full transition-colors duration-300", s <= strengthScore ? strengthColors[strengthScore] : "bg-kv-outline-variant/30")}
                        ></div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="w-full kv-btn-primary text-white font-bold py-3 px-4 rounded-lg mt-6 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Password"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
