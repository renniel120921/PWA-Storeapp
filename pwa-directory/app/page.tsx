"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApprovedPwas } from "@/lib/services/pwa.service";
import { useAuth } from "@/hooks/useAuth";
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
} from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
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

  const filteredApps = useMemo(() => {
    let list = [...apps];

    // 1. Category Filter
    if (selectedCategory && selectedCategory !== "all") {
      list = list.filter((app) => {
        const cat = app.primaryCategory?.toLowerCase() || "";
        const categories = (app.categories || []).map((c) => c.toLowerCase());
        return (
          cat === selectedCategory.toLowerCase() ||
          categories.includes(selectedCategory.toLowerCase())
        );
      });
    }

    // 2. Search Filter (title, description, tagline, tags)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((app) => {
        const title = (app.title || "").toLowerCase();
        const desc = (app.description || "").toLowerCase();
        const tagline = (app.tagline || "").toLowerCase();
        const tags = (app.tags || []).join(" ").toLowerCase();
        return (
          title.includes(q) ||
          desc.includes(q) ||
          tagline.includes(q) ||
          tags.includes(q)
        );
      });
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === "name_asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "name_desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      if (sortBy === "oldest") {
        const getTimestamp = (val: Pwa["submittedAt"]) => {
          if (!val) return 0;
          if (typeof val === "object" && "seconds" in val) return val.seconds;
          if (val instanceof Date) return val.getTime();
          return 0;
        };
        return getTimestamp(a.submittedAt) - getTimestamp(b.submittedAt);
      }
      // Default: newest first
      const getTimestamp = (val: Pwa["submittedAt"]) => {
        if (!val) return 0;
        if (typeof val === "object" && "seconds" in val) return val.seconds;
        if (val instanceof Date) return val.getTime();
        return 0;
      };
      return getTimestamp(b.submittedAt) - getTimestamp(a.submittedAt);
    });

    return list;
  }, [apps, selectedCategory, debouncedSearch, sortBy]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("newest");
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
            </div>

            {/* Desktop Auth & Actions */}
            <div className="hidden md:flex items-center gap-3">
              {authLoading ? (
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
                    href="/dashboard"
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

              <div className="pt-2 border-t border-(--line) flex flex-col gap-3">
                {authLoading ? (
                  <div className="w-full h-12 rounded-md bg-(--ink)/5 animate-pulse" />
                ) : isAuthenticated ? (
                  <>
                    <div className="flex items-center justify-between py-1">
                      <Link
                        href="/dashboard"
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
                            {profile?.fullName || user?.displayName || "Developer"}
                          </span>
                          <span className="text-[11px] font-mono text-(--body-dim)">
                            {isAdmin ? "Administrator (View Dashboard)" : "View Developer Dashboard"}
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

        {/* Directory */}
        <section id="directory" className="py-24 md:py-32 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-medium text-(--ink) mb-2 tracking-tight">
                  The directory
                </h2>
                <p className="text-(--body) text-lg">
                  {loading
                    ? "Loading catalog..."
                    : apps.length > 0
                    ? `${filteredApps.length} of ${apps.length} app${apps.length === 1 ? "" : "s"} listed.`
                    : "Apps built by the community."}
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
