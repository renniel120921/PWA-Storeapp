"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getRankedPwas, type RankedPwa } from "@/lib/services/ranking.service";
import { DIRECTORY_CATEGORIES } from "@/lib/constants/categories";
import { StarRating } from "@/components/reviews/StarRating";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Compass,
} from "lucide-react";

export default function RankingsPage() {
  const [apps, setApps] = useState<RankedPwa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadRankings() {
      setLoading(true);
      try {
        const ranked = await getRankedPwas({
          category: selectedCategory,
        });

        if (!isCancelled) {
          setApps(ranked);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load app rankings:", err);
          setApps([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadRankings();

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink) flex flex-col selection:bg-(--coral) selection:text-white"
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
      {/* Public Navigation Header                                              */}
      {/* --------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-(--card)/90 backdrop-blur-md border-b border-(--line) px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-(--ink) text-(--paper) flex items-center justify-center font-serif font-bold text-base shadow-[2px_2px_0_0_var(--coral)] group-hover:shadow-[3px_3px_0_0_var(--coral)] transition-all">
              L
            </div>
            <span className="font-display font-bold text-lg text-(--ink) tracking-tight">
              Likha Apps
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-xs font-mono">
            <Link
              href="/"
              className="text-(--body) hover:text-(--ink) transition-colors"
            >
              Directory
            </Link>
            <span className="text-(--line)">/</span>
            <Link
              href="/rankings"
              className="text-(--ink) font-semibold flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Rankings</span>
            </Link>
            <span className="text-(--line)">/</span>
            <Link
              href="/about"
              className="text-(--body) hover:text-(--ink) transition-colors"
            >
              About
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/submit">
            <Button
              size="sm"
              className="bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium h-9 px-4 rounded-md shadow-none cursor-pointer"
            >
              Submit App
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="border-(--line) text-(--ink) bg-(--card) hover:bg-(--ink-soft) text-xs font-mono h-9 px-3"
            >
              Developer Hub
            </Button>
          </Link>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* Page Hero Header                                                      */}
      {/* --------------------------------------------------------------------- */}
      <section className="border-b border-(--line) bg-(--card) py-10 sm:py-14 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-mono font-medium">
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>Official Marketplace Leaderboard</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-(--ink)">
                Top Ranked Apps
              </h1>
              <p className="text-sm sm:text-base text-(--body) mt-2 max-w-2xl leading-relaxed">
                Discover the highest-rated progressive web apps in the Likha Apps marketplace, ranked by genuine user feedback and confidence-weighted scores.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="self-start md:self-auto h-9 px-3 border-(--line) text-(--body) hover:text-(--ink) bg-(--card) hover:bg-(--ink-soft) text-xs font-mono cursor-pointer shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Ranking Note */}
          <div className="pt-2 text-[11px] font-mono text-(--body-dim) flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Rankings consider both rating quality and number of verified community ratings.</span>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* Category Filter Bar                                                   */}
      {/* --------------------------------------------------------------------- */}
      <section className="sticky top-[61px] z-30 bg-(--paper)/95 backdrop-blur-md border-b border-(--line) px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {DIRECTORY_CATEGORIES.map((cat) => {
            const isSelected =
              selectedCategory.toLowerCase() === cat.slug.toLowerCase();
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                aria-pressed={isSelected}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-150 shrink-0 border cursor-pointer ${
                  isSelected
                    ? "bg-(--ink) text-(--paper) border-(--ink) shadow-xs"
                    : "bg-(--card) text-(--body) border-(--line) hover:border-(--ink)/40 hover:text-(--ink)"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* Ranked Leaderboard List                                               */}
      {/* --------------------------------------------------------------------- */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {loading ? (
            <div className="space-y-3.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-(--card) border border-(--line) p-5 animate-pulse"
                />
              ))}
            </div>
          ) : apps.length === 0 ? (
            /* Empty State */
            <div className="py-20 rounded-2xl bg-(--card) border-2 border-dashed border-(--line) text-center p-8 space-y-4 shadow-[4px_4px_0_0_var(--line)]">
              <div className="w-14 h-14 rounded-2xl bg-(--ink)/5 text-(--body-dim) flex items-center justify-center mx-auto">
                <Trophy className="w-7 h-7 opacity-40" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-xl font-medium text-(--ink)">
                  No ranked apps yet
                </h3>
                <p className="text-xs sm:text-sm text-(--body) max-w-md mx-auto">
                  {selectedCategory !== "all"
                    ? `No apps in the "${selectedCategory}" category have received user ratings yet.`
                    : "Once applications receive user ratings, they will automatically appear on this leaderboard."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link href="/">
                  <Button
                    variant="outline"
                    className="border-(--line) text-(--ink) bg-(--card) hover:bg-(--ink-soft) text-xs font-mono h-9 px-4"
                  >
                    <Compass className="w-3.5 h-3.5 mr-1.5" />
                    <span>Browse All Apps</span>
                  </Button>
                </Link>
                <Link href="/submit">
                  <Button className="bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium h-9 px-4">
                    Submit App
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Leaderboard Cards */
            <div className="space-y-3.5">
              {apps.map((app) => {
                const isTop1 = app.rank === 1;
                const isTop2 = app.rank === 2;
                const isTop3 = app.rank === 3;
                const isPodium = app.rank <= 3;

                return (
                  <div
                    key={app.id}
                    className={`rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isTop1
                        ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-(--card) border-amber-400/80 shadow-[4px_4px_0_0_#d97706]"
                        : isTop2
                        ? "bg-gradient-to-r from-slate-200/40 via-slate-100/20 to-(--card) border-slate-300 shadow-[4px_4px_0_0_#94a3b8]"
                        : isTop3
                        ? "bg-gradient-to-r from-amber-700/10 via-amber-700/5 to-(--card) border-amber-700/30 shadow-[4px_4px_0_0_#b45309]"
                        : "bg-(--card) border-(--line) shadow-[3px_3px_0_0_var(--line)] hover:border-(--ink)/40 hover:shadow-[4px_4px_0_0_var(--ink)]"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      {/* Rank Medal / Badge */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isTop1 ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500 text-amber-950 font-display text-lg sm:text-xl font-extrabold flex items-center justify-center shadow-md border border-amber-300">
                            #1
                          </div>
                        ) : isTop2 ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-300 text-slate-900 font-display text-lg sm:text-xl font-extrabold flex items-center justify-center shadow-md border border-slate-200">
                            #2
                          </div>
                        ) : isTop3 ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-700 text-amber-50 font-display text-lg sm:text-xl font-extrabold flex items-center justify-center shadow-md border border-amber-600">
                            #3
                          </div>
                        ) : (
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-(--ink-soft) text-(--ink) font-mono text-sm sm:text-base font-bold flex items-center justify-center border border-(--line)">
                            #{app.rank}
                          </div>
                        )}
                      </div>

                      {/* App Icon */}
                      <div className="shrink-0">
                        {app.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={app.iconUrl}
                            alt={`${app.title} icon`}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-(--line) object-cover bg-white shadow-xs"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-(--ink) text-(--paper) font-display text-xl font-bold flex items-center justify-center shadow-[2px_2px_0_0_var(--coral)]">
                            {app.title ? app.title.charAt(0).toUpperCase() : "P"}
                          </div>
                        )}
                      </div>

                      {/* App Details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/apps/${app.slug}`}
                            className="font-display text-base sm:text-lg font-semibold text-(--ink) hover:text-(--coral) transition-colors truncate"
                          >
                            {app.title}
                          </Link>

                          {isPodium && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider ${
                                isTop1
                                  ? "bg-amber-500/20 text-amber-900 border border-amber-500/30"
                                  : isTop2
                                  ? "bg-slate-200 text-slate-800 border border-slate-300"
                                  : "bg-amber-700/20 text-amber-900 border border-amber-700/30"
                              }`}
                            >
                              {isTop1 ? "Leader" : isTop2 ? "Runner-Up" : "Top 3"}
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded text-[11px] font-mono text-(--body-dim) bg-(--ink)/5 uppercase tracking-wider">
                            {app.primaryCategory}
                          </span>
                        </div>

                        <p className="text-xs text-(--body) line-clamp-1 sm:line-clamp-2 max-w-xl">
                          {app.tagline || app.description}
                        </p>

                        <div className="flex items-center gap-3 pt-0.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <StarRating value={app.ratingAverage} size="sm" readOnly />
                            <span className="font-display font-bold text-(--ink)">
                              {app.ratingAverage.toFixed(1)}
                            </span>
                          </div>

                          <span className="text-(--body-dim) font-mono text-[11px]">
                            • {app.ratingCount} {app.ratingCount === 1 ? "rating" : "ratings"}
                          </span>

                          <span className="text-(--body-dim) font-mono text-[11px] hidden sm:inline">
                            • by {app.developerName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action CTA */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-(--line)/50">
                      {app.appUrl && (
                        <a
                          href={app.appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hidden md:inline-flex"
                        >
                          <Button
                            variant="outline"
                            className="h-9 px-3 border-(--line) text-(--body) hover:text-(--ink) bg-(--card) hover:bg-(--ink-soft) text-xs font-mono"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            <span>Launch</span>
                          </Button>
                        </a>
                      )}

                      <Link href={`/apps/${app.slug}`} className="flex-1 sm:flex-initial">
                        <Button
                          className={`w-full sm:w-auto h-9 px-4 text-xs font-medium rounded-md shadow-none flex items-center justify-center gap-1.5 cursor-pointer ${
                            isTop1
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-(--ink) hover:bg-[#1a3d40] text-(--paper)"
                          }`}
                        >
                          <span>View App</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* --------------------------------------------------------------------- */}
      {/* Public Footer                                                         */}
      {/* --------------------------------------------------------------------- */}
      <footer className="border-t border-(--line) bg-(--card) py-8 px-4 sm:px-8 text-center text-xs font-mono text-(--body-dim) space-y-2">
        <p>© {new Date().getFullYear()} Likha Apps Marketplace. Authentic PWA Rankings.</p>
        <div className="flex items-center justify-center gap-4 text-[11px]">
          <Link href="/" className="hover:text-(--ink) underline">
            Directory
          </Link>
          <Link href="/rankings" className="hover:text-(--ink) underline">
            Rankings
          </Link>
          <Link href="/submit" className="hover:text-(--ink) underline">
            Publish an App
          </Link>
        </div>
      </footer>
    </div>
  );
}
