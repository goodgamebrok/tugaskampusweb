import { useState, useRef } from "react";
import { HeaderLogo } from "@/components/header-logo";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get("email") || "";
  
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  
  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      toast({ title: "Error", description: "Masukkan kode 6 digit", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/user/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Gagal verifikasi email");
      }
      
      toast({ title: "Verifikasi Berhasil", description: "Email kamu telah diverifikasi" });
      localStorage.setItem("userToken", data.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      const res = await fetch("/api/user/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengirim ulang kode");
      toast({ title: "Berhasil", description: data.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased overflow-x-hidden selection:bg-kv-primary-container selection:text-kv-on-primary-container bg-kv-background text-kv-on-surface">
      {/* Atmospheric Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-kv-primary/10 rounded-full blur-[120px] opacity-50 transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-kv-secondary-container/10 rounded-full blur-[100px] opacity-40 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <main className="flex-grow flex items-center justify-center p-4 md:p-6 mb-16 relative z-10">
        <div className="w-full max-w-md kv-surface-card border border-kv-outline-variant/20 rounded-2xl p-8 flex flex-col items-center backdrop-blur-xl shadow-xl">
          {/* Brand Logo */}
          <div className="mb-8 flex flex-col items-center">
            <Link href="/" className="flex items-center gap-2 mb-2 group cursor-pointer">
              <HeaderLogo size="sm" className="rounded-lg" />
              <span className="font-sora text-kv-primary text-xl font-black uppercase tracking-tighter group-hover:opacity-80 transition-opacity">
                KING VYPERS
              </span>
            </Link>
            <p className="font-mono text-kv-label text-kv-primary tracking-widest uppercase mt-1">
              PREMIUM ROBLOX SCRIPT
            </p>
          </div>
          
          {/* Verification Content */}
          <div className="text-center mb-8 w-full">
            <h2 className="text-2xl font-bold font-sora text-kv-on-surface mb-2">Verifikasi Email</h2>
            <p className="text-kv-on-surface-variant text-sm mb-1 font-sans">Kami telah mengirimkan kode verifikasi ke</p>
            <p className="text-kv-primary font-medium">{email}</p>
          </div>
          
          {/* OTP Form */}
          <form className="w-full flex flex-col items-center" onSubmit={handleVerify}>
            <div className="flex gap-2 justify-center mb-6 w-full">
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
                  className="w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold text-kv-on-surface bg-kv-surface-container-high border border-kv-outline-variant/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-kv-primary focus:border-kv-primary transition-colors"
                  maxLength={1}
                  type="text"
                />
              ))}
            </div>
            
            <div className="text-center mb-6 w-full">
              <p className="text-kv-on-surface-variant text-sm">
                Kode akan kadaluarsa dalam <span className="text-kv-primary font-mono font-bold">10:00</span>
              </p>
            </div>
            
            <button 
              className="w-full kv-btn-primary text-white font-mono text-kv-label uppercase tracking-wider py-4 rounded-xl font-bold transition-all duration-300 transform active:scale-[0.98] mb-6 flex items-center justify-center gap-2 disabled:opacity-50" 
              type="submit"
              disabled={loading}
            >
              {loading ? "Memverifikasi..." : "Verifikasi"}
            </button>
            
            <p className="text-kv-on-surface-variant text-sm">
              Belum menerima code?{" "}
              <button 
                type="button"
                className="text-kv-primary hover:text-kv-primary-container transition-colors font-medium cursor-pointer"
                onClick={handleResend}
              >
                Kirim ulang
              </button>
            </p>
          </form>
          
          {/* Info Box */}
          <div className="mt-8 w-full bg-kv-surface-container-low border border-kv-outline-variant/30 rounded-lg p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-kv-primary mt-0.5 text-[20px]">
              forward_to_inbox
            </span>
            <p className="text-sm text-kv-on-surface-variant leading-tight">
              Periksa juga folder Spam atau Promosi<br />
              Jika tidak ada di kotak masuk utama.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
