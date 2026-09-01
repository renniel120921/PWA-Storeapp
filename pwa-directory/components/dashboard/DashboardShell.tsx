"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Layers,
  PlusCircle,
  Clock,
  KeyRound,
  Compass,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface DashboardShellProps {
  role: "developer" | "admin";
  children: React.ReactNode;
}

export function DashboardShell({ role, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const developerNav: NavItem[] = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "My Apps",
      href: "/dashboard#apps",
      icon: Layers,
    },
    {
      label: "Submit App",
      href: "/submit",
      icon: PlusCircle,
    },
  ];

  const adminNav: NavItem[] = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Review Queue",
      href: "/admin/review",
      icon: Clock,
    },
    {
      label: "Admin Setup",
      href: "/admin-bootstrap",
      icon: KeyRound,
    },
  ];

  const navItems = role === "admin" ? adminNav : developerNav;

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const userInitials = (profile?.fullName || user?.displayName || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-(--card) border-r border-(--line) text-(--ink)">
      {/* Brand Header */}
      <div className="p-5 border-b border-(--line) flex items-center justify-between">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-lg bg-(--ink) text-(--paper) flex items-center justify-center font-serif font-bold text-lg shadow-[2px_2px_0_0_var(--coral)] group-hover:shadow-[3px_3px_0_0_var(--coral)] transition-all">
            L
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg tracking-tight text-(--ink)">
                Likha Apps
              </span>
              {role === "admin" ? (
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded">
                  ADMIN
                </span>
              ) : (
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                  DEV
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-(--body-dim)">
              {role === "admin" ? "Moderation Portal" : "Developer Portal"}
            </p>
          </div>
        </Link>

        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-(--body) hover:text-(--ink) hover:bg-(--ink-soft) transition-colors md:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto" aria-label="Portal Navigation">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-(--body-dim)">
          {role === "admin" ? "Administration" : "Workspace"}
        </div>

        {navItems.map((item) => {
          const isActive =
            (item.href === "/dashboard" && pathname === "/dashboard") ||
            (item.href === "/admin" && pathname === "/admin") ||
            (item.href === "/submit" && pathname.startsWith("/submit")) ||
            (item.href === "/admin/review" && pathname.startsWith("/admin/review")) ||
            (item.href === "/admin-bootstrap" && pathname.startsWith("/admin-bootstrap"));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-(--ink) text-(--paper) shadow-[3px_3px_0_0_var(--coral)]"
                  : "text-(--body) hover:text-(--ink) hover:bg-(--ink-soft)"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-(--coral)" : "text-(--body)"}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-(--body-dim)">
          Marketplace
        </div>

        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-(--body) hover:text-(--ink) hover:bg-(--ink-soft) transition-all"
        >
          <Compass className="w-4 h-4 text-(--body)" />
          <span>Public Directory</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
        </Link>
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3.5 border-t border-(--line) bg-(--paper)/40 space-y-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-9 h-9 rounded-full bg-(--ink) text-(--paper) font-mono text-xs font-semibold flex items-center justify-center border border-(--line) shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-(--ink) truncate">
              {profile?.fullName || user?.displayName || (role === "admin" ? "Administrator" : "Developer")}
            </p>
            <p className="text-[11px] font-mono text-(--body-dim) truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-(--body) hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink) flex flex-col md:flex-row overflow-x-hidden"
      style={
        {
          "--paper": "#F6F4EC",
          "--card": "#FFFFFF",
          "--ink": "#122A2C",
          "--ink-soft": "#EEEAD9",
          "--body": "#4C5652",
          "--body-dim": "#7A8480",
          "--line": "#DBD5C3",
          "--coral": "#FF6A4D",
        } as React.CSSProperties
      }
    >
      {/* --------------------------------------------------------------------- */}
      {/* Desktop Persistent Sidebar (w-64)                                     */}
      {/* --------------------------------------------------------------------- */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* --------------------------------------------------------------------- */}
      {/* Mobile Top Header Bar                                                 */}
      {/* --------------------------------------------------------------------- */}
      <header className="md:hidden sticky top-0 z-40 bg-(--card) border-b border-(--line) px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-(--ink) hover:bg-(--ink-soft) border border-(--line) transition-colors cursor-pointer"
            aria-label="Open portal navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-(--ink) text-(--paper) flex items-center justify-center font-serif font-bold text-sm">
              L
            </div>
            <span className="font-display font-bold text-base text-(--ink)">
              Likha Apps
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {role === "admin" ? (
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded">
              ADMIN
            </span>
          ) : (
            <span className="font-mono text-[10px] font-medium uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
              DEV
            </span>
          )}
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* Mobile Navigation Drawer & Backdrop                                   */}
      {/* --------------------------------------------------------------------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs h-full bg-(--card) shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Main Content Area                                                     */}
      {/* --------------------------------------------------------------------- */}
      <main className="flex-1 md:pl-64 min-w-0 flex flex-col overflow-x-hidden">
        <div className="flex-1 p-4 sm:p-7 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
