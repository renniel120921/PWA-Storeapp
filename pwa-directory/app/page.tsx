"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApprovedPwas } from "@/lib/services/pwa.service";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchBar } from "@/components/directory/SearchBar";
import { CategoryFilter } from "@/components/directory/CategoryFilter";
import { SortDropdown, type SortOption } from "@/components/directory/SortDropdown";
import { PwaGrid } from "@/components/directory/PwaGrid";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  ExternalLink,
  Menu,
  X,
  ShieldOff,
  Zap,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { calculateAppRankings } from "@/lib/services/ranking.service";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

import type { Pwa } from "@/types";

const WHY_ROWS = [
  {
    icon: ShieldOff,
    title: "No review queue",
    body: "Meet the basic PWA bar installable, works offline, served over https and your listing goes live. No two-week wait for a stranger to click approve.",
  },
  {
    icon: Zap,
    title: "Keep what you earn",
    body: "Charge however you like. We don't sit between you and your users, so there's no 30% cut coming out of your subscriptions or purchases.",
  },
  {
    icon: RefreshCw,
    title: "Ship the moment you push",
    body: "Update your server and the change is live. Nobody re-downloads a package or waits on a store to approve the new version.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Create an account",
    body: "Sign up as a developer it takes less time than filling in an app-store form.",
  },
  {
    n: "2",
    title: "Submit your listing",
    body: "Title, URL, a short description, and a category. That's the whole form.",
  },
  {
    n: "3",
    title: "Go live",
    body: "Listings pass an automated PWA check and appear in the directory, usually within the hour.",
  },
];

/** Reveals its children with a smooth fade/rise the first time they scroll into view. */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setTimeout(() => setVisible(true), 0); // Fixed synchronous state update
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const {
    user,
    profile,
    isAuthenticated,
    isAdmin,
    loading: authLoading,
    logout,
  } = useAuth();

  const [apps, setApps] = useState<Pwa[]>([]);
  const [loading, setLoading] = useState(true);
  const hasMounted = useHydrated();
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("search") || params.get("q") || "";
    }
    return "";
  });

  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("category") || "all";
    }
    return "all";
  });

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sortParam = params.get("sort") || "recommended";
      if (
        sortParam === "recommended" ||
        sortParam === "top_rated" ||
        sortParam === "top-rated" ||
        sortParam === "newest" ||
        sortParam === "name_asc" ||
        sortParam === "a-z"
      ) {
        return sortParam === "top-rated"
          ? "top_rated"
          : sortParam === "a-z"
          ? "name_asc"
          : (sortParam as SortOption);
      }
    }
    return "recommended";
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [parallax, setParallax] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 250);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  useEffect(() => {
    const fetchPWAs = async () => {
      try {
        const pwaList = await getApprovedPwas();
        setApps(pwaList);
      } catch (error) {
        console.error("Error fetching PWAs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPWAs();
  }, []);

  // Listen to browser Back / Forward popstate events
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const searchParam = params.get("search") || params.get("q") || "";
      const categoryParam = params.get("category") || "all";
      const sortParam = params.get("sort") || "recommended";

      setSearchQuery(searchParam);
      setSelectedCategory(categoryParam);
      if (
        sortParam === "recommended" ||
        sortParam === "top_rated" ||
        sortParam === "top-rated" ||
        sortParam === "newest" ||
        sortParam === "name_asc" ||
        sortParam === "a-z"
      ) {
        const normalizedSort: SortOption =
          sortParam === "top-rated"
            ? "top_rated"
            : sortParam === "a-z"
            ? "name_asc"
            : (sortParam as SortOption);
        setSortBy(normalizedSort);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Synchronize state changes to URL query parameters for shareability
  useEffect(() => {
    if (!hasMounted) return;
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    }
    if (selectedCategory && selectedCategory !== "all") {
      params.set("category", selectedCategory);
    }
    if (sortBy && sortBy !== "recommended") {
      params.set("sort", sortBy);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : "/";
    if (window.location.search !== (queryString ? `?${queryString}` : "")) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [debouncedSearch, selectedCategory, sortBy, hasMounted]);

  // Shared Bayesian Ranking Calculation (computed in memory from fetched directory pool)
  const topRankedApps = useMemo(() => {
    return calculateAppRankings(apps).slice(0, 4);
  }, [apps]);

  // Bayesian ranking scores map for directory sorting
  const rankingScoresMap = useMemo(() => {
    const ranked = calculateAppRankings(apps);
    const map = new Map<string, number>();
    ranked.forEach((r) => {
      map.set(r.id, r.rankingScore);
    });
    return map;
  }, [apps]);

  const filteredApps = useMemo(() => {
    let list = [...apps];

    // 1. Category Filter
    if (selectedCategory && selectedCategory !== "all") {
      const selected = selectedCategory.toLowerCase();
      list = list.filter((app) => {
        const cat = (app.primaryCategory || "").toLowerCase();
        const categories = (app.categories || []).map((c) => c.toLowerCase());
        return cat === selected || categories.includes(selected);
      });
    }

    // 2. Search Filter (title, developerName, description, tagline, category, tags)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((app) => {
        const title = (app.title || "").toLowerCase();
        const devName = (app.developerName || "").toLowerCase();
        const desc = (app.description || "").toLowerCase();
        const tagline = (app.tagline || "").toLowerCase();
        const primaryCat = (app.primaryCategory || "").toLowerCase();
        const categories = (app.categories || []).join(" ").toLowerCase();
        const tags = (app.tags || []).join(" ").toLowerCase();

        return (
          title.includes(q) ||
          devName.includes(q) ||
          desc.includes(q) ||
          tagline.includes(q) ||
          primaryCat.includes(q) ||
          categories.includes(q) ||
          tags.includes(q)
        );
      });
    }

    // 3. Sorting Strategies
    list.sort((a, b) => {
      if (sortBy === "name_asc") {
        return (a.title || "").localeCompare(b.title || "");
      }

      if (sortBy === "top_rated") {
        const scoreA = rankingScoresMap.get(a.id) || 0;
        const scoreB = rankingScoresMap.get(b.id) || 0;
        const scoreDiff = scoreB - scoreA;
        if (Math.abs(scoreDiff) > 1e-6) return scoreDiff;

        const countDiff = (b.ratingCount || 0) - (a.ratingCount || 0);
        if (countDiff !== 0) return countDiff;

        const avgDiff = (b.ratingAverage || 0) - (a.ratingAverage || 0);
        if (Math.abs(avgDiff) > 1e-6) return avgDiff;

        return (a.title || "").localeCompare(b.title || "");
      }

      if (sortBy === "newest") {
        const getTimestamp = (val: Pwa["submittedAt"]) => {
          if (!val) return 0;
          if (typeof val === "object" && "seconds" in val) return val.seconds;
          if (val instanceof Date) return val.getTime();
          return 0;
        };
        const timeDiff =
          getTimestamp(b.approvedAt || b.submittedAt) -
          getTimestamp(a.approvedAt || a.submittedAt);
        if (timeDiff !== 0) return timeDiff;
        return (a.title || "").localeCompare(b.title || "");
      }

      // Default: "recommended"
      // Featured apps first, then Bayesian ranking score, then published timestamp, then A-Z
      if (Boolean(b.isFeatured) !== Boolean(a.isFeatured)) {
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }

      const scoreA = rankingScoresMap.get(a.id) || 0;
      const scoreB = rankingScoresMap.get(b.id) || 0;
      const scoreDiff = scoreB - scoreA;
      if (Math.abs(scoreDiff) > 1e-6) return scoreDiff;

      const getTimestamp = (val: Pwa["submittedAt"]) => {
        if (!val) return 0;
        if (typeof val === "object" && "seconds" in val) return val.seconds;
        if (val instanceof Date) return val.getTime();
        return 0;
      };
      const timeDiff =
        getTimestamp(b.approvedAt || b.submittedAt) -
        getTimestamp(a.approvedAt || a.submittedAt);
      if (timeDiff !== 0) return timeDiff;

      return (a.title || "").localeCompare(b.title || "");
    });

    return list;
  }, [apps, selectedCategory, debouncedSearch, sortBy, rankingScoresMap]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("recommended");
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      if (!prefersReduced) {
        setParallax(Math.min(scrollTop * 0.08, 40));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const goToSignup = () => router.push(isAuthenticated ? "/submit" : "/signup");

  return (
    <div
      className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}
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
          "--gold": "#A9791F",
        } as React.CSSProperties
      }
    >
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        body {
          font-family: var(--font-body), sans-serif;
        }
        .font-display {
          font-family: var(--font-display), serif;
        }
        .font-mono {
          font-family: var(--font-mono), monospace;
        }
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes stampIn {
          0% {
            opacity: 0;
            transform: rotate(-18deg) scale(0.6);
          }
          60% {
            opacity: 1;
            transform: rotate(-8deg) scale(1.08);
          }
          100% {
            opacity: 1;
            transform: rotate(-8deg) scale(1);
          }
        }
        .hero-enter {
          animation: fadeSlideUp 0.7s ease-out both;
        }
        .hero-enter-delay-1 {
          animation: fadeSlideUp 0.7s ease-out 0.12s both;
        }
        .hero-enter-delay-2 {
          animation: fadeSlideUp 0.7s ease-out 0.24s both;
        }
        .stamp-enter {
          animation: stampIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
        }
        .catalog-card {
          box-shadow: 5px 5px 0 0 var(--line);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .catalog-card:hover {
          transform: translate(-4px, -4px);
          box-shadow: 9px 9px 0 0 var(--ink);
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-enter,
          .hero-enter-delay-1,
          .hero-enter-delay-2,
          .stamp-enter {
            animation: none !important;
          }
          .catalog-card {
            transition: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-(--paper) text-(--ink)">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 w-full bg-(--paper)/90 backdrop-blur-md border-b border-(--line)">
          <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
            <button
              className="flex items-center gap-2.5 group"
              onClick={() => scrollToSection("home")}
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-(--ink) text-(--paper) font-display text-sm font-semibold transition-transform group-hover:scale-105">
                LA
              </span>
              <span className="font-display text-lg font-semibold text-(--ink) tracking-tight">
                Likha Apps
              </span>
            </button>

            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("about")}
                className="text-sm font-medium text-(--body) hover:text-(--ink) transition-colors"
              >
                Why Likha
              </button>
              <button
                onClick={() => scrollToSection("how")}
                className="text-sm font-medium text-(--body) hover:text-(--ink) transition-colors"
              >
                How it works
              </button>
              <button
                onClick={() => scrollToSection("directory")}
                className="text-sm font-medium text-(--body) hover:text-(--ink) transition-colors"
              >
                Directory
              </button>
              <Link
                href="/rankings"
                className="text-sm font-medium text-(--ink) hover:text-(--coral) transition-colors flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Rankings</span>
              </Link>
            </div>

            {/* Desktop Auth & Actions */}
            <div className="hidden md:flex items-center gap-3">
              {!hasMounted || authLoading ? (
                <div className="w-24 h-9 rounded-md bg-(--ink)/5 animate-pulse" />
              ) : isAuthenticated ? (
                <>
                  {isAdmin && (
                    <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-(--ink) text-(--paper) font-semibold">
                      <ShieldCheck className="w-3 h-3 text-(--gold)" />
                      Admin
                    </span>
                  )}
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-(--card) border border-(--line) text-xs font-mono text-(--ink) hover:border-(--ink)/40 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center text-[10px] font-sans font-bold uppercase">
                      {profile?.firstName
                        ? profile.firstName[0]
                        : user?.email
                        ? user.email[0]
                        : "D"}
                    </span>
                    <span className="font-medium truncate max-w-[120px]">
                      {profile?.firstName || user?.displayName || "Developer"}
                    </span>
                  </Link>
                  <Button
                    onClick={goToSignup}
                    className="rounded-md bg-(--coral) text-white hover:bg-[#e85a3e] px-4 h-9 shadow-none text-xs font-medium transition-colors"
                  >
                    Submit App
                  </Button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs font-medium text-(--body-dim) hover:text-(--ink) transition-colors p-1.5 rounded-md hover:bg-(--ink-soft)"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/login")}
                    className="text-sm font-medium text-(--body) hover:text-(--ink) transition-colors"
                  >
                    Log in
                  </button>
                  <Button
                    onClick={goToSignup}
                    className="rounded-md bg-(--coral) text-white hover:bg-[#e85a3e] px-5 shadow-none font-medium transition-colors"
                  >
                    Submit App
                  </Button>
                </>
              )}
            </div>

            <button
              className="md:hidden text-(--ink) hover:bg-(--ink-soft) p-2 rounded-md transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Scroll progress indicator */}
          <div
            className="h-[2px] bg-(--coral) origin-left"
            style={{
              transform: `scaleX(${scrollPct / 100})`,
              transition: "transform 0.1s linear",
            }}
          />

          {menuOpen && (
            <div className="md:hidden border-t border-(--line) bg-(--paper) px-6 py-4 flex flex-col gap-5 shadow-lg">
              <button
                onClick={() => scrollToSection("about")}
                className="text-base font-medium text-(--ink) text-left"
              >
                Why Likha
              </button>
              <button
                onClick={() => scrollToSection("how")}
                className="text-base font-medium text-(--ink) text-left"
              >
                How it works
              </button>
              <button
                onClick={() => scrollToSection("directory")}
                className="text-base font-medium text-(--ink) text-left"
              >
                Directory
              </button>
              <Link
                href="/rankings"
                onClick={() => setMenuOpen(false)}
                className="text-base font-medium text-(--ink) text-left flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Top Ranked Apps</span>
              </Link>

              <div className="pt-2 border-t border-(--line) flex flex-col gap-3">
                {!hasMounted || authLoading ? (
                  <div className="w-full h-12 rounded-md bg-(--ink)/5 animate-pulse" />
                ) : isAuthenticated ? (
                  <>
                    <div className="flex items-center justify-between py-1">
                      <Link
                        href={isAdmin ? "/admin" : "/dashboard"}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                      >
                        <span className="w-8 h-8 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center text-xs font-bold uppercase">
                          {profile?.firstName
                            ? profile.firstName[0]
                            : user?.email
                            ? user.email[0]
                            : "D"}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-(--ink) leading-tight">
                            {profile?.fullName || user?.displayName || (isAdmin ? "Administrator" : "Developer")}
                          </span>
                          <span className="text-[11px] font-mono text-(--body-dim)">
                            {isAdmin ? "Admin Moderation Portal" : "Developer Dashboard"}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="text-xs font-medium text-red-600 hover:underline flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Log out
                      </button>
                    </div>
                    <Button
                      onClick={() => {
                        setMenuOpen(false);
                        goToSignup();
                      }}
                      className="rounded-md bg-(--coral) text-white hover:bg-[#e85a3e] w-full font-medium h-12"
                    >
                      Submit App
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/login");
                      }}
                      className="text-base font-medium text-(--ink) text-left py-1"
                    >
                      Log in
                    </button>
                    <Button
                      onClick={() => {
                        setMenuOpen(false);
                        goToSignup();
                      }}
                      className="rounded-md bg-(--coral) text-white hover:bg-[#e85a3e] w-full font-medium h-12"
                    >
                      Submit App
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Hero */}
        <header
          id="home"
          className="pt-20 pb-24 md:pt-32 md:pb-36 scroll-mt-16 relative overflow-hidden"
        >
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
            <div>
              <h1 className="hero-enter font-display text-4xl sm:text-5xl md:text-6xl font-medium leading-[1.08] tracking-tight text-(--ink) mb-6">
                A shelf for the open web.
              </h1>
              <p className="hero-enter-delay-1 text-base md:text-lg text-(--body) mb-10 max-w-md leading-relaxed">
                Likha Apps is a directory of progressive web apps — no store
                fees, no review queue, no gatekeeper. Add your app once, and
                anyone with a browser can open it.
              </p>
              <div className="hero-enter-delay-2 flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={goToSignup}
                  className="rounded-md bg-(--coral) hover:bg-[#e85a3e] text-white px-7 h-12 text-base font-medium shadow-none transition-colors"
                >
                  List your app
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToSection("directory")}
                  className="rounded-md px-7 h-12 text-base font-medium border-(--ink)/25 text-(--ink) hover:bg-(--ink-soft) bg-transparent transition-colors"
                >
                  Browse the directory
                </Button>
              </div>
            </div>

            {/* Index card mockup */}
            <div
              className="hidden md:flex justify-center relative"
              style={{ transform: `translateY(${parallax}px)` }}
            >
              <div className="hero-enter-delay-1 catalog-card w-full max-w-sm bg-(--card) text-(--ink) rounded-lg border border-(--line) p-7 -rotate-2">
                <div className="flex justify-between items-start mb-6">
                  <span className="font-mono text-xs uppercase tracking-wide text-(--body-dim)">
                    entry no. 0142
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded border border-(--ink)/15 text-(--body)">
                    tools
                  </span>
                </div>
                <h3 className="font-display text-3xl font-medium mb-3">
                  SmartBasura
                </h3>
                <p className="text-sm text-(--body) leading-relaxed mb-6">
                  Household waste pickup reminders and sorting guide for
                  local barangays.
                </p>
                <div className="flex items-center justify-between font-mono text-xs text-(--body-dim) border-t border-(--line) pt-4">
                  <span>smartbasura.app</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
              <div className="stamp-enter absolute -top-4 -right-2 flex items-center justify-center w-24 h-24 rounded-full border-2 border-(--coral) text-(--coral) bg-(--paper) font-display text-sm font-semibold tracking-wide text-center leading-tight shadow-sm">
                LISTED
              </div>
            </div>
          </div>
        </header>

        {/* Why section — ledger rows */}
        <section id="about" className="py-24 md:py-32 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="mb-14 max-w-xl">
              <h2 className="font-display text-3xl md:text-4xl font-medium text-(--ink) mb-4 tracking-tight">
                Why developers list here
              </h2>
              <p className="text-(--body) text-base md:text-lg leading-relaxed">
                Traditional app stores add friction between you and the
                people who want to use what you built. Likha Apps removes
                most of it.
              </p>
            </Reveal>

            <div className="border-t border-(--line)">
              {WHY_ROWS.map((row, i) => (
                <Reveal key={row.title} delay={i * 90}>
                  <div className="grid md:grid-cols-[1fr_2fr] gap-4 md:gap-10 py-10 border-b border-(--line) items-start">
                    <div className="flex items-center gap-3">
                      <row.icon className="w-5 h-5 text-(--gold) shrink-0" />
                      <h3 className="font-display text-xl font-medium text-(--ink)">
                        {row.title}
                      </h3>
                    </div>
                    <p className="text-(--body) text-sm md:text-base leading-relaxed max-w-2xl">
                      {row.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — genuine sequence */}
        <section
          id="how"
          className="py-24 md:py-32 bg-(--ink-soft) scroll-mt-16 border-y border-(--line)"
        >
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-(--ink) mb-16 tracking-tight max-w-xl">
                From your repo to the directory
              </h2>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-12">
              {STEPS.map((step, i) => (
                <Reveal key={step.n} delay={i * 110} className="relative">
                  <span className="font-display text-6xl font-medium text-(--ink)/10 block mb-6">
                    {step.n}
                  </span>
                  <h3 className="font-display text-2xl font-medium text-(--ink) mb-3">
                    {step.title}
                  </h3>
                  <p className="text-(--body) text-base leading-relaxed">
                    {step.body}
                  </p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%+1.5rem)] w-6 border-t-2 border-dashed border-(--ink)/20" />
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Top Ranked Apps Section */}
        {topRankedApps.length > 0 && (
          <section id="rankings" className="py-20 md:py-28 bg-(--paper) border-t border-(--line) scroll-mt-16">
            <div className="max-w-6xl mx-auto px-6">
              <Reveal className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-mono font-medium mb-2.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>Community Leaderboard</span>
                  </div>
                  <h2 className="font-display text-3xl md:text-4xl font-medium text-(--ink) tracking-tight">
                    Top Ranked Apps
                  </h2>
                  <p className="text-(--body) text-base sm:text-lg mt-1">
                    The highest-rated progressive web apps ranked by community reviews and reliability.
                  </p>
                </div>

                <Link
                  href="/rankings"
                  className="text-xs font-mono font-semibold text-(--coral) hover:underline inline-flex items-center gap-1 shrink-0 group"
                >
                  <span>View all rankings</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {topRankedApps.map((app) => {
                  const isTop1 = app.rank === 1;
                  const isTop2 = app.rank === 2;
                  const isTop3 = app.rank === 3;

                  return (
                    <Link
                      key={app.id}
                      href={`/apps/${app.slug}`}
                      className="group block"
                    >
                      <div
                        className={`h-full rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 ${
                          isTop1
                            ? "bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-(--card) border-amber-400/80 shadow-[4px_4px_0_0_#d97706] group-hover:shadow-[6px_6px_0_0_#d97706] group-hover:-translate-y-1"
                            : isTop2
                            ? "bg-gradient-to-b from-slate-200/40 via-slate-100/20 to-(--card) border-slate-300 shadow-[4px_4px_0_0_#94a3b8] group-hover:shadow-[6px_6px_0_0_#94a3b8] group-hover:-translate-y-1"
                            : isTop3
                            ? "bg-gradient-to-b from-amber-700/10 via-amber-700/5 to-(--card) border-amber-700/30 shadow-[4px_4px_0_0_#b45309] group-hover:shadow-[6px_6px_0_0_#b45309] group-hover:-translate-y-1"
                            : "bg-(--card) border-(--line) shadow-[4px_4px_0_0_var(--line)] group-hover:border-(--ink)/40 group-hover:shadow-[6px_6px_0_0_var(--ink)] group-hover:-translate-y-1"
                        }`}
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-start justify-between gap-2">
                            {/* App Icon */}
                            {app.iconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={app.iconUrl}
                                alt={`${app.title} icon`}
                                className="w-12 h-12 rounded-xl border border-(--line) object-cover bg-white"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-(--ink) text-(--paper) font-display text-lg font-bold flex items-center justify-center shadow-xs">
                                {app.title ? app.title.charAt(0).toUpperCase() : "P"}
                              </div>
                            )}

                            {/* Rank Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold ${
                                isTop1
                                  ? "bg-amber-500 text-amber-950 shadow-xs"
                                  : isTop2
                                  ? "bg-slate-300 text-slate-900 shadow-xs"
                                  : isTop3
                                  ? "bg-amber-700 text-amber-50 shadow-xs"
                                  : "bg-(--ink-soft) text-(--ink)"
                              }`}
                            >
                              #{app.rank}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-display text-base font-semibold text-(--ink) group-hover:text-(--coral) transition-colors truncate">
                              {app.title}
                            </h3>
                            <p className="text-[11px] font-mono text-(--body-dim) uppercase tracking-wider">
                              {app.primaryCategory}
                            </p>
                          </div>

                          <p className="text-xs text-(--body) line-clamp-2 leading-relaxed">
                            {app.tagline || app.description}
                          </p>
                        </div>

                        <div className="pt-4 mt-2 border-t border-(--line)/50 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 font-semibold text-(--ink)">
                            <span className="text-amber-500">★</span>
                            <span>{app.ratingAverage.toFixed(1)}</span>
                            <span className="text-[11px] font-mono text-(--body-dim) font-normal">
                              ({app.ratingCount})
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-(--coral) group-hover:underline flex items-center gap-0.5">
                            View <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 text-center sm:hidden">
                <Link href="/rankings">
                  <Button
                    variant="outline"
                    className="w-full h-10 border-(--line) text-(--ink) bg-(--card) hover:bg-(--ink-soft) font-medium text-xs font-mono"
                  >
                    <span>View all marketplace rankings</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Directory */}
        <section id="directory" className="py-24 md:py-32 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-medium text-(--ink) mb-2 tracking-tight">
                  The directory
                </h2>
                <p className="text-(--body) text-base sm:text-lg">
                  {loading
                    ? "Loading marketplace catalog..."
                    : apps.length > 0
                    ? debouncedSearch || selectedCategory !== "all"
                      ? `Showing ${filteredApps.length} of ${apps.length} app${apps.length === 1 ? "" : "s"}.`
                      : `Browse ${apps.length} verified progressive web app${apps.length === 1 ? "" : "s"} ready to use in your browser.`
                    : "Discover installable web applications built by the community."}
                </p>
              </div>
            </Reveal>

            {/* Controls Bar: Search, Sort & Category Filter */}
            <div className="mb-10 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex-1 max-w-lg">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                  />
                </div>
                <SortDropdown value={sortBy} onChange={setSortBy} />
              </div>

              <CategoryFilter
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            <PwaGrid
              apps={filteredApps}
              loading={loading}
              searchQuery={debouncedSearch}
              selectedCategory={selectedCategory}
              onClearFilters={handleClearFilters}
              onOpenSubmit={goToSignup}
            />
          </div>
        </section>

        {/* CTA banner — the one bold, inverted moment */}
        <section className="py-24 md:py-32 bg-(--ink)">
          <Reveal className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="font-display text-3xl md:text-5xl font-medium text-(--paper) mb-6 tracking-tight">
              Building something worth bookmarking?
            </h2>
            <p className="text-(--paper)/80 text-base md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed font-light">
              Create an account and submit your listing title, URL,
              description, category. Thats the whole form.
            </p>
            <Button
              size="lg"
              onClick={goToSignup}
              className="rounded-md bg-(--coral) hover:bg-[#e85a3e] text-white px-10 h-14 text-lg font-medium shadow-none transition-colors"
            >
              Get started
            </Button>
          </Reveal>
        </section>

        {/* Footer */}
        <footer className="py-14 border-t border-(--line) bg-(--paper)">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-(--ink)/5 p-2 rounded-full">
                <Rocket className="h-5 w-5 text-(--body-dim)" />
              </div>
              <span className="font-display text-base font-medium text-(--ink)">
                Likha Apps
              </span>
            </div>
            <p className="text-(--body-dim) text-sm font-medium">
              © {new Date().getFullYear()} Likha Apps. Built for developers,
              by developers.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
