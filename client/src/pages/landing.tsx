import { useEffect, useState, useMemo } from "react";
import { HeaderLogo } from "@/components/header-logo";
import bannerSrc from "@/assets/banner.png";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import type { Showcase, Package, Team, Testimonial, GameSupport } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

function getYoutubeId(url: string | null): string {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : "";
}

export default function Landing() {
  const [videoModal, setVideoModal] = useState<{ id: number; vidId: string } | null>(null);
  const [activeSection, setActiveSection] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const words = useMemo(() => ["Game", "Play", "Experience"], []);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const handleType = () => {
      const fullWord = words[currentWordIdx];
      if (!isDeleting) {
        const nextText = fullWord.substring(0, currentText.length + 1);
        setCurrentText(nextText);
        setTypingSpeed(150);

        if (nextText === fullWord) {
          setTypingSpeed(2000); // pause at full word
          setIsDeleting(true);
        }
      } else {
        const nextText = fullWord.substring(0, currentText.length - 1);
        setCurrentText(nextText);
        setTypingSpeed(75);

        if (nextText === "") {
          setIsDeleting(false);
          setCurrentWordIdx((prev) => (prev + 1) % words.length);
          setTypingSpeed(500); // pause before next word
        }
      }
    };

    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIdx, typingSpeed, words]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 100) {
        setActiveSection("home");
        return;
      }
      
      const sections = ["features", "pricing", "games", "showcase"];
      let current = "";
      
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            current = section;
          }
        }
      }
      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveSection("home");
    } else {
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: "smooth" });
        setActiveSection(id);
      }
    }
  };

  const { data: showcaseItems = [] } = useQuery<Showcase[]>({
    queryKey: ["/api/showcase"],
    queryFn: async () => {
      const res = await fetch("/api/showcase");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const viewMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/showcase/${id}/view`, { method: "POST" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed")))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/showcase"] }),
  });

  const openVideo = (item: Showcase) => {
    const vidId = getYoutubeId(item.youtubeUrl);
    if (vidId) {
      setVideoModal({ id: item.id, vidId });
      viewMutation.mutate(item.id);
    }
  };

  const { data: packageItems = [] } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
    queryFn: async () => {
      const res = await fetch("/api/packages");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: gameSupport = [] } = useQuery<GameSupport[]>({
    queryKey: ["/api/game-support"],
    queryFn: async () => {
      const res = await fetch("/api/game-support");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: teamsItems = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) return [];
      return res.json();
    },
  });

  type TestimonialWithUser = {
    id: number;
    message: string;
    rating: number;
    status: string;
    createdAt: string;
    user?: { username: string; avatarUrl?: string | null };
  };

  const { data: testimonialItems = [] } = useQuery<TestimonialWithUser[]>({
    queryKey: ["/api/testimonials"],
    queryFn: async () => {
      const res = await fetch("/api/testimonials");
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="font-sans text-base antialiased overflow-x-hidden relative selection:bg-kv-primary-container selection:text-kv-on-primary-container bg-kv-background text-kv-on-surface">
      {/* Atmospheric Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-kv-primary/10 rounded-full blur-[120px] opacity-50 transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-kv-secondary-container/10 rounded-full blur-[100px] opacity-40 transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      {/* TopNavBar */}
      <nav className="docked w-full top-0 fixed z-50 bg-kv-surface/60 backdrop-blur-xl border-b border-kv-outline-variant/10 shadow-lg shadow-kv-primary/5 transition-all duration-300">
        <div className="flex justify-between items-center h-20 px-gutter max-w-container-max mx-auto">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <HeaderLogo size="sm" className="rounded-lg" />
            <span className="font-sora text-kv-primary text-xl font-black uppercase tracking-tighter group-hover:opacity-80 transition-opacity">
              KING VYPERS
            </span>
          </Link>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { id: "home", label: "Home", href: "#" },
              { id: "features", label: "Features", href: "#features" },
              { id: "pricing", label: "Pricing", href: "#pricing" },
              { id: "games", label: "Games", href: "#games" },
              { id: "showcase", label: "Showcase", href: "#showcase" },
            ].map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => scrollTo(e, link.id)}
                  className={cn(
                    "relative px-4 py-2 rounded-full font-mono text-sm transition-colors duration-300",
                    isActive ? "text-kv-primary font-bold" : "text-kv-on-surface-variant font-medium hover:text-kv-primary"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-kv-primary/10 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </a>
              );
            })}
          </div>

          {/* Trailing Action */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="font-mono text-kv-label text-kv-on-surface-variant font-medium hover:text-kv-primary transition-colors hover:bg-kv-primary/10 px-3 py-2 rounded-md transition-all duration-300">
              Login
            </Link>
            <Link href="/beli" className="kv-btn-primary text-white font-mono text-kv-label px-6 py-2.5 rounded-full font-bold uppercase tracking-wider scale-95 hover:scale-100 active:scale-90 transition-transform">
              Get Premium
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-kv-on-surface-variant hover:text-kv-primary transition-colors p-2"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-kv-surface/95 backdrop-blur-xl border-t border-kv-outline-variant/10 px-6 pb-6 pt-4 flex flex-col gap-2">
            {[
              { id: "home", label: "Home", href: "#" },
              { id: "features", label: "Features", href: "#features" },
              { id: "pricing", label: "Pricing", href: "#pricing" },
              { id: "games", label: "Games", href: "#games" },
              { id: "showcase", label: "Showcase", href: "#showcase" },
            ].map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => { scrollTo(e, link.id); setMobileMenuOpen(false); }}
                className="font-mono text-sm py-3 px-4 rounded-xl text-kv-on-surface-variant hover:text-kv-primary hover:bg-kv-primary/10 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-kv-outline-variant/10 mt-2 pt-4 flex flex-col gap-3">
              <Link href="/login" className="font-mono text-sm py-3 px-4 rounded-xl text-center text-kv-on-surface-variant hover:text-kv-primary hover:bg-kv-primary/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Login
              </Link>
              <Link href="/beli" className="kv-btn-primary text-white font-mono text-sm px-6 py-3 rounded-full font-bold uppercase tracking-wider text-center" onClick={() => setMobileMenuOpen(false)}>
                Get Premium
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 px-gutter overflow-hidden">
          <div className="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <motion.div
              className="space-y-8 relative z-10"
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div
                className="inline-flex items-center gap-2 bg-kv-primary/10 border border-kv-primary/20 rounded-full px-4 py-1.5 backdrop-blur-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <span className="w-2 h-2 rounded-full bg-kv-primary animate-pulse"></span>
                <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest">
                  #1 Premium Roblox Script
                </span>
              </motion.div>
              <motion.h1
                className="font-sora text-kv-display md:text-6xl text-kv-on-surface font-extrabold leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                Level Up Your <br />
                <span className="kv-gradient-text bg-clip-text">
                  {currentText}
                </span>
                <span className="animate-pulse text-kv-primary ml-1">|</span>
              </motion.h1>
              <motion.p
                className="font-sans text-base text-kv-on-surface-variant max-w-lg text-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                Script premium berkualitas tinggi, aman, stabil, dan selalu update. Dirancang untuk memberikan pengalaman terbaik di berbagai game Roblox favoritmu.
              </motion.p>
              <motion.div
                className="flex flex-wrap gap-4 text-sm text-kv-on-surface-variant"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-kv-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Aman &amp; Anti Ban
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-kv-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>update</span> Update Rutin
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-kv-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span> Support 24/7
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-kv-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span> Mudah Digunakan
                </div>
              </motion.div>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <Link href="/beli" className="kv-btn-primary text-white font-mono text-[14px] px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wide">
                  <span className="material-symbols-outlined text-lg">shopping_cart</span>
                  Beli Sekarang
                </Link>
                <a href="#showcase" className="bg-kv-surface-variant text-kv-on-surface border border-kv-outline-variant/30 hover:bg-kv-surface-bright font-mono text-[14px] px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wide transition-colors">
                  Lihat Showcase
                  <span className="material-symbols-outlined text-lg">play_arrow</span>
                </a>
              </motion.div>
            </motion.div>

            {/* Hero Image/Graphic */}
            <motion.div
              className="relative w-full h-[600px] flex items-center justify-center lg:justify-end"
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-kv-primary-container/20 blur-[100px] rounded-full z-0"></div>
              <img
                className="relative z-10 w-full max-w-md object-contain animate-kv-float"
                src={bannerSrc}
                alt="Hero"
              />
              
              {/* Floating Stat Cards */}
              <motion.div
                className="absolute top-10 left-0 lg:left-0 bg-kv-surface-container/80 backdrop-blur-md border border-kv-outline-variant/20 p-4 rounded-xl shadow-xl z-20 animate-kv-float-slow"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.5, type: "spring" }}
              >
                <p className="font-sora text-kv-headline text-kv-primary text-2xl font-bold">100%</p>
                <p className="text-xs text-kv-on-surface-variant uppercase tracking-wider mt-1">Safe &amp; Secure</p>
              </motion.div>
              <motion.div
                className="absolute bottom-1/4 left-0 lg:-left-10 bg-kv-surface-container/80 backdrop-blur-md border border-kv-outline-variant/20 p-4 rounded-xl shadow-xl z-20 animate-kv-float-fast"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, duration: 0.5, type: "spring" }}
              >
                <p className="font-sora text-kv-headline text-kv-primary text-2xl font-bold">99.9%</p>
                <p className="text-xs text-kv-on-surface-variant uppercase tracking-wider mt-1">Uptime</p>
              </motion.div>
              <motion.div
                className="absolute bottom-10 right-10 bg-kv-surface-container/80 backdrop-blur-md border border-kv-outline-variant/20 p-4 rounded-xl shadow-xl z-20 animate-kv-float"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.6, duration: 0.5, type: "spring" }}
              >
                <p className="font-sora text-kv-headline text-kv-primary text-2xl font-bold">10K+</p>
                <p className="text-xs text-kv-on-surface-variant uppercase tracking-wider mt-1">Happy Users</p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="kv-divider-glow max-w-container-max mx-auto my-8"></div>

        {/* Features Section */}
        <section className="py-24 px-gutter" id="features">
          <div className="max-w-container-max mx-auto">
            <motion.div
              className="text-center mb-16 space-y-4"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest">ABOUT SCRIPT</span>
              <h2 className="font-sora text-kv-headline md:text-4xl text-kv-on-surface font-bold">
                Kenapa Harus King Vypers?
              </h2>
              <p className="text-kv-on-surface-variant max-w-2xl mx-auto">
                Dibuat dengan kualitas terbaik untuk memberikan performa maksimal di setiap game yang kamu mainkan.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: "speed", title: "Performa Stabil", desc: "Script dioptimalkan untuk performa terbaik tanpa lag dan crash." },
                { icon: "sync", title: "Selalu Update", desc: "Update rutin menyesuaikan dengan game update agar tetap aman digunakan." },
                { icon: "widgets", title: "Fitur Lengkap", desc: "Fitur premium lengkap yang membuat pengalaman bermain lebih menyenangkan." },
                { icon: "verified_user", title: "Aman & Terpercaya", desc: "Sistem keamanan berlapis untuk menjaga akun kamu tetap aman dari banned." },
              ].map((feat, i) => (
                <motion.div
                  key={feat.title}
                  className="kv-surface-card p-8 rounded-2xl text-center group"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                >
                  <div className="w-16 h-16 mx-auto bg-kv-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-kv-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-kv-primary text-3xl">{feat.icon}</span>
                  </div>
                  <h3 className="font-bold text-kv-on-surface text-xl mb-3">{feat.title}</h3>
                  <p className="text-sm text-kv-on-surface-variant">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Showcase Section */}
        {packageItems.length > 0 && (
          <section className="py-24 px-gutter relative" id="pricing">
            <div className="absolute inset-0 bg-kv-primary/5 clip-path-polygon-[0_10%,100%_0,100%_90%,0_100%] z-0 pointer-events-none"></div>
            <div className="max-w-container-max mx-auto relative z-10">
              <motion.div
                className="text-center mb-16 space-y-4"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest">PILIH PAKET PREMIUM</span>
                <h2 className="font-sora text-kv-headline md:text-4xl text-kv-on-surface font-bold">Daftar Harga</h2>
                <p className="text-kv-on-surface-variant max-w-2xl mx-auto">Pilih paket <span className="text-kv-primary font-semibold">yang sesuai kebutuhanmu</span></p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
                {packageItems.map((pkg, idx) => {
                  const price = Number(pkg.price ?? 0) || 0;
                  return (
                    <motion.div
                      key={pkg.id}
                      className={cn("kv-surface-card p-8 rounded-3xl flex flex-col h-full border", pkg.isPopular ? "border-2 border-kv-primary relative kv-glow transform scale-105 z-10 bg-kv-surface-container-low" : "border-kv-outline-variant/20")}
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.5, delay: idx * 0.15 }}
                    >
                      {pkg.isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-kv-primary text-slate-950 font-mono text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold flex items-center gap-1 shadow-md">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> Paling Populer
                        </div>
                      )}
                      
                      <div className="text-center mb-8 pt-2">
                        <h3 className={cn("font-bold text-kv-on-surface mb-2", pkg.isPopular ? "text-2xl" : "text-xl")}>{pkg.title}</h3>
                        <p className={cn("text-sm mb-6", pkg.isPopular ? "text-kv-primary font-medium" : "text-kv-on-surface-variant")}>{pkg.durationDays} Hari Akses</p>
                        <div className="flex items-start justify-center gap-1">
                          <span className="text-kv-primary font-bold mt-1">Rp</span>
                          <span className={cn("font-extrabold text-kv-on-surface tracking-tight", pkg.isPopular ? "text-5xl" : "text-4xl")}>{price.toLocaleString("id-ID")}</span>
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
                      
                      <Link href="/login" className="w-full mt-8 block">
                        <button className={cn("w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wide", pkg.isPopular ? "kv-btn-primary text-white text-sm" : "bg-kv-surface-container hover:bg-kv-surface-bright text-kv-on-surface border border-kv-outline-variant/30 text-sm transition-colors")}>
                          <span className="material-symbols-outlined text-sm">shopping_cart</span>
                          Beli Sekarang
                        </button>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Games Section */}
        {gameSupport.length > 0 && (
          <section className="py-24 px-gutter" id="games">
            <div className="max-w-container-max mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Games Info (Left) */}
                <motion.div
                  className="lg:col-span-3 space-y-6"
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="font-sora text-kv-headline md:text-3xl text-kv-on-surface font-bold">
                    Game Support <br /><span className="text-kv-primary">Premium</span>
                  </h2>
                  <p className="text-kv-on-surface-variant text-sm">
                    Mendukung berbagai game populer dengan fitur yang selalu update.
                  </p>
                </motion.div>

                {/* Games Grid (Center) */}
                <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {gameSupport.slice(0, 11).map((g, gi) => (
                    <motion.div
                      key={g.id}
                      className="kv-surface-card p-3 rounded-xl flex items-center gap-3"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: gi * 0.05 }}
                    >
                      {g.logoUrl ? (
                          <img className="w-10 h-10 rounded-lg object-cover" src={g.logoUrl} alt="" />
                      ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><span className="material-symbols-outlined text-sm">gamepad</span></div>
                      )}
                      <span className="text-sm font-medium text-kv-on-surface leading-tight text-xs">{g.gameName}</span>
                    </motion.div>
                  ))}
                  {gameSupport.length > 11 && (
                    <div className="kv-surface-card p-3 rounded-xl flex items-center justify-center gap-3 bg-kv-surface-container-high hover:bg-kv-surface-bright cursor-pointer border-dashed">
                      <span className="material-symbols-outlined text-kv-primary">apps</span>
                      <span className="text-sm font-medium text-kv-primary">Dan Banyak Lagi</span>
                    </div>
                  )}
                </div>

                {/* Status Indicator (Right) */}
                <motion.div
                  className="lg:col-span-3"
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="kv-surface-card p-6 rounded-2xl h-full flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-kv-primary mb-6">Status Game Support</h4>
                      <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                          <div>
                            <p className="text-sm font-semibold text-kv-on-surface">Full Support</p>
                            <p className="text-xs text-kv-on-surface-variant">Fitur lengkap &amp; optimal</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 mt-1.5 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                          <div>
                            <p className="text-sm font-semibold text-kv-on-surface">Partial Support</p>
                            <p className="text-xs text-kv-on-surface-variant">Beberapa fitur tersedia</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                          <div>
                            <p className="text-sm font-semibold text-kv-on-surface">Not Support</p>
                            <p className="text-xs text-kv-on-surface-variant">Belum tersedia</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                    <div className="pt-6 mt-6 border-t border-kv-outline-variant/20">
                      <p className="text-sm text-kv-on-surface-variant">Total Game Supported</p>
                      <p className="font-bold text-kv-primary text-lg">{gameSupport.length}+ Games</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        )}

        {/* Pricing Section */}
        {showcaseItems.length > 0 && (
          <section className="py-24 px-gutter" id="showcase">
            <div className="max-w-container-max mx-auto bg-kv-surface-container border border-kv-outline-variant/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-kv-primary/10 blur-[80px] z-0"></div>
              
              <motion.div
                className="relative z-10 text-center mb-12 space-y-4"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest">SHOWCASE SCRIPT</span>
                <h2 className="font-sora text-kv-headline md:text-3xl text-kv-on-surface font-bold">Lihat Script In Action</h2>
              </motion.div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                {showcaseItems.map((item, index) => {
                  const vidId = getYoutubeId(item.youtubeUrl);
                  return (
                    <motion.div
                      key={item.id}
                      className="group"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
                    >
                      <div className="aspect-video bg-kv-surface-container-high rounded-xl border border-kv-outline-variant/20 overflow-hidden relative shadow-lg">
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                          <button onClick={() => openVideo(item)} className="w-12 h-12 bg-kv-primary text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                          </button>
                        </div>
                        {vidId ? (
                            <img className="w-full h-full object-cover" src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`} alt="" />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-kv-on-surface-variant">No Video</div>
                        )}
                      </div>
                      <h4 className="text-kv-on-surface font-semibold mt-4 text-center">{item.scriptName}</h4>
                      <p className="text-kv-on-surface-variant text-xs text-center">{item.gameName}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Testimonials Section */}
        {testimonialItems.length > 0 && (
          <section className="py-24 px-gutter" id="testimonials">
            <div className="max-w-container-max mx-auto">
              <motion.div
                className="text-center mb-16 space-y-4"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest">TESTIMONI</span>
                <h2 className="font-headline-lg text-headline-lg md:text-4xl text-kv-on-surface font-bold">Apa Kata Mereka?</h2>
                <p className="text-kv-body-lg text-kv-on-surface-variant max-w-2xl mx-auto">Review jujur dari pengguna King Vypers yang sudah merasakan manfaatnya.</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonialItems.map((t, ti) => (
                  <motion.div
                    key={t.id}
                    className="group relative kv-surface-card rounded-2xl border border-kv-outline-variant/15 p-6 hover:border-kv-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-kv-primary/5"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: ti * 0.1 }}
                  >
                    {/* Decorative quote */}
                    <div className="absolute top-4 right-4 text-kv-primary/10 text-5xl font-serif leading-none select-none">"</div>

                    {/* Stars */}
                    <div className="flex gap-0.5 mb-4">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`material-symbols-outlined text-lg ${s <= t.rating ? 'text-amber-400' : 'text-kv-outline-variant/30'}`} style={s <= t.rating ? { fontVariationSettings: "'FILL' 1" } : {}}>
                          star
                        </span>
                      ))}
                    </div>

                    {/* Message */}
                    <p className="text-kv-on-surface text-sm leading-relaxed mb-6 line-clamp-4">"{t.message}"</p>

                    {/* User */}
                    <div className="flex items-center gap-3 border-t border-kv-outline-variant/10 pt-4">
                      {t.user?.avatarUrl ? (
                        <img src={t.user.avatarUrl} alt={t.user.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-kv-primary/20" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-kv-primary-container flex items-center justify-center text-kv-on-primary-container font-bold text-sm">
                          {t.user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm text-kv-on-surface">{t.user?.username || 'Anonymous'}</div>
                        <div className="text-xs text-kv-on-surface-variant">Verified Buyer</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="py-24 px-gutter" id="faq">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="text-center mb-12 space-y-4"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest">PERTANYAAN UMUM</span>
              <h2 className="font-headline-lg text-headline-lg md:text-4xl text-kv-on-surface font-bold">Frequently Asked Questions</h2>
            </motion.div>
            
            <motion.div
              className="kv-surface-card p-6 md:p-10 rounded-3xl border border-kv-outline-variant/20"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-b border-kv-outline-variant/10">
                  <AccordionTrigger className="text-left text-kv-on-surface hover:text-kv-primary transition-colors py-4">
                    Apakah script ini aman dari Banned?
                  </AccordionTrigger>
                  <AccordionContent className="text-kv-on-surface-variant leading-relaxed">
                    Untuk sistem Anti-Ban sebenarnya kami sudah buat seaman mungkin (Bypass Anti-Cheat). Tapi kembali lagi ke gaya bermain (penggunaan) dari user. Jika digunakan secara brutal dan sering di-report player lain, risiko ban tetap ada. Jadi tetap "Safe, Stay Safe" bro!
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-b border-kv-outline-variant/10">
                  <AccordionTrigger className="text-left text-kv-on-surface hover:text-kv-primary transition-colors py-4">
                    Bagaimana cara pakai / install script-nya?
                  </AccordionTrigger>
                  <AccordionContent className="text-kv-on-surface-variant leading-relaxed">
                    Sangat mudah! Setelah membeli paket, kamu akan mendapatkan Key dan panduan lengkap. Kamu hanya perlu copy script loader kami, paste ke executor favorit kamu, masukkan Key, dan script siap digunakan.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-b border-kv-outline-variant/10">
                  <AccordionTrigger className="text-left text-kv-on-surface hover:text-kv-primary transition-colors py-4">
                    Apakah script ini support dimainkan di HP (Mobile)?
                  </AccordionTrigger>
                  <AccordionContent className="text-kv-on-surface-variant leading-relaxed">
                    Tentu saja! Script kami sudah dioptimalkan untuk berbagai executor PC maupun Android (Mobile) seperti Fluxus, Delta, dan lainnya tanpa mengurangi performa fitur.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border-none">
                  <AccordionTrigger className="text-left text-kv-on-surface hover:text-kv-primary transition-colors py-4">
                    Apakah pembayarannya sekali bayar (One-Time)?
                  </AccordionTrigger>
                  <AccordionContent className="text-kv-on-surface-variant leading-relaxed">
                    Kami menyediakan beberapa paket. Ada paket bulanan dan juga paket Lifetime (Permanent) jika kamu ingin berlangganan seumur hidup. Silakan cek bagian daftar harga (Pricing).
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* Developer / Socials Section */}
        <section className="py-24 px-gutter" id="developers">
          <div className="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* About Founder */}
            <motion.div
              className="kv-surface-card p-8 rounded-3xl lg:col-span-1"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
            >
              <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest mb-6 block">ABOUT ME (FOUNDER)</span>
              <div className="flex items-center gap-4 mb-6">
                <HeaderLogo size="xl" className="flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-kv-on-surface text-xl">King Vypers</h3>
                  <p className="text-sm text-kv-primary">Founder &amp; Developer</p>
                </div>
              </div>
              <p className="text-sm text-kv-on-surface-variant mb-8 leading-relaxed">
                Halo! Saya King Vypers, developer script Roblox sejak 2021. Fokus saya adalah membuat script berkualitas tinggi, aman, dan selalu update untuk memberikan pengalaman terbaik bagi user.
              </p>
              <div className="flex justify-between border-t border-kv-outline-variant/20 pt-6">
                <div className="text-center">
                  <p className="font-bold text-kv-primary text-xl">3+</p>
                  <p className="text-xs text-kv-on-surface-variant">Tahun Experience</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-kv-primary text-xl">10K+</p>
                  <p className="text-xs text-kv-on-surface-variant">Happy Users</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-kv-primary text-xl">50+</p>
                  <p className="text-xs text-kv-on-surface-variant">Game Supported</p>
                </div>
              </div>
            </motion.div>
            
            {/* Social Media */}
            <motion.div
              className="kv-surface-card p-8 rounded-3xl lg:col-span-1 flex flex-col justify-between"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div>
                <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest mb-2 block">SOCIAL MEDIA</span>
                <p className="text-sm text-kv-on-surface-variant mb-6">Terhubung dengan saya di platform berikut</p>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <a className="bg-kv-surface-container-high hover:bg-kv-surface-bright p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-kv-outline-variant/10" href="https://discord.gg/XmWf3YQPpZ" target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined text-[#5865F2] text-3xl">forum</span>
                    <span className="text-xs font-semibold text-kv-on-surface">Discord</span>
                    <span className="text-[10px] text-kv-on-surface-variant">Join Server</span>
                  </a>
                  <a className="bg-kv-surface-container-high hover:bg-kv-surface-bright p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-kv-outline-variant/10" href="https://www.youtube.com/@KingVypers" target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined text-[#FF0000] text-3xl">play_circle</span>
                    <span className="text-xs font-semibold text-kv-on-surface">YouTube</span>
                    <span className="text-[10px] text-kv-on-surface-variant">Subscribe</span>
                  </a>
                  <a className="bg-kv-surface-container-high hover:bg-kv-surface-bright p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-kv-outline-variant/10" href="https://www.tiktok.com/@kingvyperr" target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined text-kv-on-surface text-3xl">music_note</span>
                    <span className="text-xs font-semibold text-kv-on-surface">TikTok</span>
                    <span className="text-[10px] text-kv-on-surface-variant">Follow</span>
                  </a>
                </div>
              </div>
              <a href="https://discord.gg/XmWf3YQPpZ" target="_blank" rel="noopener noreferrer" className="w-full kv-btn-primary text-white font-mono text-kv-label py-3 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wide">
                <span className="material-symbols-outlined text-sm">groups</span>
                Join Semua
              </a>
            </motion.div>
            
            {/* Developer Team */}
            <motion.div
              className="kv-surface-card p-8 rounded-3xl lg:col-span-1"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className="font-mono text-kv-label text-kv-primary uppercase tracking-widest mb-2 block">DEVELOPER TEAM</span>
              <p className="text-sm text-kv-on-surface-variant mb-6">Team di balik King Vypers</p>
              <div className="space-y-4">
                {teamsItems.length > 0 ? (
                  teamsItems.map((team) => (
                    <div key={team.id} className="flex items-center gap-4 bg-kv-surface-container/50 p-3 rounded-xl border border-kv-outline-variant/10">
                      {team.photoUrl ? (
                        <img src={team.photoUrl} alt={team.fullName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          team.accent === "primary" 
                            ? "bg-kv-primary-container text-kv-on-primary-container"
                            : "bg-kv-surface-bright text-kv-on-surface"
                        )}>
                          <span className="material-symbols-outlined text-lg">
                            {team.role.toLowerCase().includes("support") ? "support_agent" 
                              : team.role.toLowerCase().includes("design") ? "design_services"
                              : team.role.toLowerCase().includes("script") ? "code"
                              : "person"}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-kv-on-surface">{team.fullName}</h4>
                        <p className={cn("text-xs", team.accent === "primary" ? "text-kv-primary" : "text-kv-on-surface-variant")}>
                          {team.role}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-kv-on-surface-variant italic">Belum ada tim yang ditambahkan.</p>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-kv-surface-container-lowest border-t border-kv-outline-variant/10 pt-16 pb-8 mt-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 px-gutter max-w-container-max mx-auto mb-16">
          {/* Brand & Copy */}
          <div className="md:col-span-4 space-y-4 opacity-80 hover:opacity-100 transition-opacity">
            <a className="flex items-center gap-2" href="#">
              <HeaderLogo size="sm" className="rounded-lg" />
              <span className="font-mono text-kv-on-surface text-lg font-bold uppercase tracking-tighter">KING VYPERS</span>
            </a>
            <p className="font-mono text-kv-label text-kv-primary uppercase tracking-widest mt-1">Premium Roblox Script</p>
            <p className="font-sans text-sm text-kv-on-surface-variant mt-8">© 2024 King Vypers. All rights reserved.</p>
          </div>
          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="font-bold text-kv-on-surface mb-6">Quick Links</h4>
            <ul className="space-y-3 font-mono text-kv-label">
              <li><a className="text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block" href="#">Home</a></li>
              <li><a className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block" href="#features">Features</a></li>
              <li><a className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block" href="#pricing">Pricing</a></li>
              <li><a className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block" href="#games">Games</a></li>
              <li><a className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block" href="#showcase">Showcase</a></li>
            </ul>
          </div>
          {/* Support */}
          <div className="md:col-span-2">
            <h4 className="font-bold text-kv-on-surface mb-6">Support</h4>
            <ul className="space-y-3 font-mono text-kv-label">
              <li><a className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block" href="#faq">FAQ</a></li>
              <li><Link href="/terms-of-service" className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block">Terms of Service</Link></li>
              <li><Link href="/privacy-policy" className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block">Privacy Policy</Link></li>
              <li><a className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block" href="#">Refund Policy</a></li>
              <li><a className="text-kv-on-surface-variant hover:text-kv-primary hover:translate-x-1 transition-transform duration-200 inline-block" href="#">Contact Us</a></li>
            </ul>
          </div>
          {/* Stay Updated */}
          <div className="md:col-span-4">
            <h4 className="font-bold text-kv-on-surface mb-2">Stay Updated</h4>
            <p className="text-sm text-kv-on-surface-variant mb-6">Dapatkan update terbaru dan promo menarik!</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input className="w-full bg-kv-surface-container border border-kv-outline-variant/30 rounded-lg px-4 py-2 text-sm text-kv-on-surface focus:outline-none focus:border-kv-primary focus:ring-1 focus:ring-kv-primary transition-colors" placeholder="Masukkan email kamu" type="email"/>
              <button className="kv-btn-primary text-white px-4 py-2 rounded-lg text-sm font-bold" type="submit">Subscribe</button>
            </form>
            <div className="flex gap-4 mt-6">
              <a className="text-kv-on-surface-variant hover:text-kv-primary transition-colors" href="#"><span className="material-symbols-outlined">forum</span></a>
              <a className="text-kv-on-surface-variant hover:text-kv-primary transition-colors" href="#"><span className="material-symbols-outlined">play_circle</span></a>
              <a className="text-kv-on-surface-variant hover:text-kv-primary transition-colors" href="#"><span className="material-symbols-outlined">music_note</span></a>
            </div>
          </div>
        </div>
      </footer>

      {/* Video modal */}
      <Dialog open={!!videoModal} onOpenChange={() => setVideoModal(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-kv-outline-variant/20">
          <DialogHeader className="sr-only">
            <DialogTitle>Video Showcase</DialogTitle>
          </DialogHeader>
          {videoModal && (
            <div>
              <div className="aspect-video w-full bg-black">
                <iframe
                  title="YouTube"
                  src={`https://www.youtube-nocookie.com/embed/${videoModal.vidId}`}
                  className="h-full w-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <div className="flex justify-center border-t border-kv-outline-variant/20 bg-kv-surface/50 p-3">
                <a
                  href={`https://www.youtube.com/watch?v=${videoModal.vidId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  Tonton di YouTube
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
