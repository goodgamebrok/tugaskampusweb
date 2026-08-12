"use client"

import { Switch, Route, Redirect, Link, useLocation } from "wouter";
import { HeaderLogo } from "@/components/header-logo";
import { Key, Package, ShoppingCart, User, LogOut, Star } from "lucide-react";
import { useUserAuth } from "@/lib/user-auth";

import { UserKeys } from "./user-keys";
import { UserPackages } from "./user-packages";
import { UserOrders } from "./user-orders";
import { UserAccount } from "./user-account";
import { UserTestimonials } from "./user-testimonials";

const navItems = [
  { title: "My Keys", url: "/user/dashboard", icon: Key },
  { title: "Store", url: "/user/packages", icon: Package },
  { title: "Orders", url: "/user/orders", icon: ShoppingCart },
  { title: "Review", url: "/user/review", icon: Star },
  { title: "Account", url: "/user/account", icon: User },
];

export function UserLayout() {
  const [location] = useLocation();
  const { logout, user } = useUserAuth();

  return (
    <div className="flex min-h-screen flex-col w-full bg-kv-background text-kv-on-surface font-sans antialiased relative overflow-x-hidden">


      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-40 w-full bg-kv-surface/60 backdrop-blur-xl border-b border-kv-outline-variant/10 shadow-lg shadow-kv-primary/5">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
          {/* Brand */}
          <Link href="/user/dashboard" className="flex items-center gap-2.5 group">
            <HeaderLogo size="sm" className="rounded-lg" />
            <span className="font-sora text-kv-primary text-lg font-black uppercase tracking-tighter group-hover:opacity-80 transition-opacity hidden sm:inline">
              KING VYPERS
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.url || (item.url !== "/user/dashboard" && location.startsWith(item.url));
              const isDashActive = item.url === "/user/dashboard" && (location === "/user/dashboard" || location === "/user");
              const active = isActive || isDashActive;
              return (
                <Link key={item.title} href={item.url}>
                  <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 font-mono ${
                    active
                      ? "bg-kv-primary/15 text-kv-primary border border-kv-primary/30"
                      : "text-kv-on-surface-variant hover:text-kv-primary hover:bg-kv-primary/5 border border-transparent"
                  }`}>
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop User + Logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {(user as any)?.avatarUrl ? (
                <img
                  src={(user as any).avatarUrl}
                  alt={user?.username || ""}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-kv-primary/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-kv-primary-container flex items-center justify-center text-xs font-bold text-kv-on-primary-container">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <span className="text-sm font-medium text-kv-on-surface max-w-[120px] truncate">{user?.username}</span>
            </div>
            <div className="h-5 w-px bg-kv-outline-variant/30" />
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-kv-on-surface-variant hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all text-sm"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile: Avatar */}
          <div className="md:hidden flex items-center gap-2">
            {(user as any)?.avatarUrl ? (
              <img src={(user as any).avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-kv-primary/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-kv-primary-container flex items-center justify-center text-xs font-bold text-kv-on-primary-container">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 w-full mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10 pb-24 md:pb-10">
        <Switch>
          <Route path="/user" component={() => <Redirect to="/user/dashboard" />} />
          <Route path="/user/dashboard" component={UserKeys} />
          <Route path="/user/packages" component={UserPackages} />
          <Route path="/user/orders" component={UserOrders} />
          <Route path="/user/review" component={UserTestimonials} />
          <Route path="/user/account" component={UserAccount} />
          <Route component={() => <Redirect to="/user/dashboard" />} />
        </Switch>
      </main>

      {/* ── Bottom Navigation (Mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-kv-surface/80 backdrop-blur-xl border-t border-kv-outline-variant/10">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = location === item.url || (item.url !== "/user/dashboard" && location.startsWith(item.url));
            const isDashActive = item.url === "/user/dashboard" && (location === "/user/dashboard" || location === "/user");
            const active = isActive || isDashActive;
            return (
              <Link key={item.title} href={item.url} className="flex-1">
                <div className={`flex flex-col items-center justify-center gap-1 py-1.5 transition-all ${active ? "text-kv-primary" : "text-kv-on-surface-variant"}`}>
                  <item.icon className={`h-5 w-5 ${active ? "stroke-[2.5px]" : ""}`} />
                  <span className={`text-[9px] font-mono uppercase tracking-wider ${active ? "font-bold" : "font-medium"}`}>{item.title}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
