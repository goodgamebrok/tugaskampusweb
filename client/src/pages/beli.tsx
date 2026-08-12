import { Link } from "wouter";
import { HeaderLogo } from "@/components/header-logo";
import { useQuery } from "@tanstack/react-query";
import { formatRupiah } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Package } from "@shared/schema";

export default function BeliSekarang() {
  const { data: packages = [], isLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
    queryFn: async () => {
      const res = await fetch("/api/packages");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: stockData } = useQuery<{
    items: Array<{ id: number; totalAvailable: number; exactAvailable: number; genericAvailable: number }>;
  }>({
    queryKey: ["/api/stocks/packages"],
    queryFn: async () => {
      const res = await fetch("/api/stocks/packages");
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const stockById = new Map<number, { totalAvailable: number; exactAvailable: number; genericAvailable: number }>(
    (stockData?.items || []).map((s) => [s.id, { totalAvailable: s.totalAvailable, exactAvailable: s.exactAvailable, genericAvailable: s.genericAvailable }]),
  );

  return (
    <div className="font-sans text-base antialiased overflow-x-hidden relative selection:bg-kv-primary-container selection:text-kv-on-primary-container bg-kv-background text-kv-on-surface min-h-screen flex flex-col">
      {/* Atmospheric Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-kv-primary/10 rounded-full blur-[120px] opacity-50 transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-kv-secondary-container/10 rounded-full blur-[100px] opacity-40 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      {/* TopNavBar */}
      <nav className="docked w-full top-0 sticky z-50 bg-kv-surface/60 backdrop-blur-xl border-b border-kv-outline-variant/10 shadow-lg shadow-kv-primary/5 transition-all duration-300">
        <div className="flex justify-between items-center h-20 px-gutter max-w-container-max mx-auto">
          <Link href="/" className="flex items-center gap-2 group">
            <HeaderLogo size="sm" className="rounded-lg" />
            <span className="font-sora text-kv-primary text-xl font-black uppercase tracking-tighter group-hover:opacity-80 transition-opacity">
              KING VYPERS
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="font-mono text-kv-label text-kv-on-surface-variant font-medium hover:text-kv-primary transition-colors hover:bg-kv-primary/10 px-3 py-2 rounded-md transition-all duration-300 hidden md:inline-block">
              Beranda
            </Link>
            <Link href="/login" className="font-mono text-kv-label text-kv-on-surface-variant font-medium hover:text-kv-primary transition-colors hover:bg-kv-primary/10 px-3 py-2 rounded-md transition-all duration-300 hidden md:inline-block">
              Login
            </Link>
            <Link href="/validate" className="kv-btn-primary text-white font-mono text-kv-label px-6 py-2.5 rounded-full font-bold uppercase tracking-wider scale-95 hover:scale-100 active:scale-90 transition-transform">
              Validate Key
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        {/* Pricing Section */}
        <section className="py-16 md:py-24 px-gutter relative flex-1" id="pricing">
          <div className="absolute inset-0 bg-kv-primary/5 clip-path-polygon-[0_10%,100%_0,100%_90%,0_100%] z-0 pointer-events-none"></div>
          <div className="max-w-container-max mx-auto relative z-10">
            <div className="text-center mb-16 space-y-4">
              <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest">PILIH PAKET PREMIUM</span>
              <h1 className="font-sora text-kv-headline md:text-4xl text-kv-on-surface font-bold">Beli Key</h1>
              <p className="text-kv-on-surface-variant max-w-2xl mx-auto">Pilih paket <span className="text-kv-primary font-semibold">yang sesuai kebutuhanmu</span>, lalu bayar via QRIS.</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-kv-primary border-t-transparent" />
              </div>
            ) : packages.length === 0 ? (
              <p className="text-center text-kv-on-surface-variant py-16">Belum ada paket. Cek lagi nanti.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
                {packages.map((pkg) => {
                  const price = Number(pkg.price ?? 0) || 0;
                  const original = Number(pkg.originalPrice ?? 0) || 0;
                  const hasDiscount = original > 0 && original > price;
                  
                  return (
                    <div key={pkg.id} className={cn("kv-surface-card p-8 rounded-3xl flex flex-col h-full border", pkg.isPopular ? "border-2 border-kv-primary relative kv-glow transform md:scale-105 z-10 bg-kv-surface-container-low" : "border-kv-outline-variant/20")}>
                      {pkg.isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-kv-primary text-slate-950 font-mono text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold flex items-center gap-1 shadow-md">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> Paling Populer
                        </div>
                      )}
                      
                      <div className="text-center mb-8 pt-2">
                        <h3 className={cn("font-bold text-kv-on-surface mb-2", pkg.isPopular ? "text-2xl" : "text-xl")}>{pkg.title}</h3>
                        <p className={cn("text-sm mb-6", pkg.isPopular ? "text-kv-primary font-medium" : "text-kv-on-surface-variant")}>{pkg.durationDays} Hari Akses</p>
                        
                        <div className="flex flex-col items-center justify-center gap-1">
                          {hasDiscount && (
                            <span className="text-sm text-kv-on-surface-variant line-through">{formatRupiah(original)}</span>
                          )}
                          <div className="flex items-start justify-center gap-1">
                            <span className="text-kv-primary font-bold mt-1">Rp</span>
                            <span className={cn("font-extrabold text-kv-on-surface tracking-tight", pkg.isPopular ? "text-5xl" : "text-4xl")}>{price.toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-grow">
                        <ul className={cn("space-y-4 text-sm", pkg.isPopular ? "text-kv-on-surface" : "text-kv-on-surface-variant")}>
                          {[pkg.feature1, pkg.feature2, pkg.feature3, pkg.feature4].filter(Boolean).map((f, i) => (
                            <li key={i} className="flex items-center gap-3">
                              <span className={cn("material-symbols-outlined text-kv-primary", pkg.isPopular ? "text-base" : "text-sm")} style={pkg.isPopular ? { fontVariationSettings: "'FILL' 1" } : undefined}>check</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <p className="mt-4 text-center text-sm text-kv-on-surface-variant">Sisa key: {stockById.get(pkg.id)?.totalAvailable ?? 0}</p>

                      <Link href="/login" className="w-full mt-4 block">
                        <button className={cn("w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wide", pkg.isPopular ? "kv-btn-primary text-white text-sm" : "bg-kv-surface-container hover:bg-kv-surface-bright text-kv-on-surface border border-kv-outline-variant/30 text-sm transition-colors")}>
                          <span className="material-symbols-outlined text-sm">shopping_cart</span>
                          Beli Sekarang
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-16 text-center">
              <Link href="/" className="inline-flex items-center justify-center gap-2 bg-kv-surface-variant hover:bg-kv-surface-bright text-kv-on-surface border border-kv-outline-variant/30 font-mono text-[14px] px-8 py-3 rounded-xl font-bold uppercase tracking-wide transition-colors">
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Minimalist */}
      <footer className="border-t border-kv-outline-variant/20 bg-kv-surface-container-low py-8 mt-auto">
        <div className="max-w-container-max mx-auto px-gutter flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-kv-on-surface-variant text-sm">&copy; {new Date().getFullYear()} King Vypers. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-kv-on-surface-variant hover:text-kv-primary transition-colors text-sm">Terms</Link>
            <Link href="/" className="text-kv-on-surface-variant hover:text-kv-primary transition-colors text-sm">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
