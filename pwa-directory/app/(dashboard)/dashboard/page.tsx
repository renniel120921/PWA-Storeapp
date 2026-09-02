"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  getDeveloperDashboardApps,
  type DeveloperAppItem,
} from "@/lib/services/pwa.service";
import {
  Plus,
  ArrowRight,
  ExternalLink,
  Eye,
  Lock,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Compass,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { PwaStatus } from "@/types";

export default function DeveloperDashboardPage() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();

  const [items, setItems] = useState<DeveloperAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load Developer Data cleanly using deduplicated aggregation
  useEffect(() => {
    let isCancelled = false;

    async function fetchDashboard() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const apps = await getDeveloperDashboardApps(user.uid);

        if (!isCancelled) {
          setItems(apps);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load developer dashboard data:", err);
          setFetchError(
            "Unable to load your dashboard data. Please check your connection and try again."
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isCancelled = true;
    };
  }, [user, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Metric Computations (Calculated from deduplicated single-source items)
  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === "pending").length;
    const approved = items.filter((i) => i.status === "approved").length;
    const drafts = items.filter((i) => i.status === "draft").length;
    const rejected = items.filter((i) => i.status === "rejected").length;
    const suspended = items.filter((i) => i.status === "suspended").length;

    return { total, pending, approved, drafts, rejected, suspended };
  }, [items]);

  // Recent apps (up to 4 items)
  const recentApps = useMemo(() => {
    return items.slice(0, 4);
  }, [items]);

  // Auth Loading
  if (authLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-3 border-(--coral) border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-(--body-dim)">Authenticating developer...</p>
      </div>
    );
  }

  // Unauthenticated Guard
  if (!isAuthenticated) {
    return (
      <div className="py-20 flex flex-col justify-center items-center">
        <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-(--ink)/5 text-(--ink) flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-medium text-(--ink) tracking-tight mb-1">
              Developer Portal
            </h1>
            <p className="text-xs text-(--body) leading-relaxed">
              Please log in with your developer account to access your workspace.
            </p>
          </div>

          <Link href="/login">
            <Button className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm">
              Log In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-(--line)">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-(--body-dim)">
              Developer Hub
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight">
            Welcome back, {profile?.fullName || user?.displayName || "Developer"}
          </h1>
          <p className="text-xs sm:text-sm text-(--body) mt-0.5">
            Overview of your progressive web apps, publishing metrics, and review statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/apps">
            <Button
              variant="outline"
              className="h-10 px-4 border-(--line) text-(--ink) bg-(--card) hover:bg-(--ink-soft) font-medium text-xs rounded-md shadow-none flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-(--coral)" />
              <span>My Apps</span>
            </Button>
          </Link>

          <Link href="/submit">
            <Button className="h-10 px-5 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-xs rounded-md shadow-none flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Submit App</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={loading}
            className="h-10 px-3 border-(--line) text-(--body) hover:text-(--ink) bg-(--card) hover:bg-(--ink-soft) text-xs font-mono"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Apps */}
        <Link href="/dashboard/apps" className="block group">
          <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)] group-hover:border-(--ink)/40 group-hover:shadow-[4px_4px_0_0_var(--ink)] transition-all">
            <div className="flex items-center justify-between text-(--body-dim) mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Total Apps</span>
              <Layers className="w-4 h-4" />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-(--ink)">
              {loading ? "-" : stats.total}
            </div>
            <p className="text-[11px] font-mono text-(--body-dim) mt-1">Across all states</p>
          </div>
        </Link>

        {/* Live on Directory */}
        <Link href="/dashboard/apps" className="block group">
          <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)] group-hover:border-(--ink)/40 group-hover:shadow-[4px_4px_0_0_var(--ink)] transition-all">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Approved</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-800">
              {loading ? "-" : stats.approved}
            </div>
            <p className="text-[11px] font-mono text-emerald-700 mt-1">Published live</p>
          </div>
        </Link>

        {/* In Review */}
        <Link href="/dashboard/apps" className="block group">
          <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)] group-hover:border-(--ink)/40 group-hover:shadow-[4px_4px_0_0_var(--ink)] transition-all">
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">In Review</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-amber-800">
              {loading ? "-" : stats.pending}
            </div>
            <p className="text-[11px] font-mono text-amber-700 mt-1">Pending approval</p>
          </div>
        </Link>

        {/* Drafts */}
        <Link href="/dashboard/apps" className="block group">
          <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)] group-hover:border-(--ink)/40 group-hover:shadow-[4px_4px_0_0_var(--ink)] transition-all">
            <div className="flex items-center justify-between text-(--body-dim) mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Drafts</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-(--ink)">
              {loading ? "-" : stats.drafts}
            </div>
            <p className="text-[11px] font-mono text-(--body-dim) mt-1">Unsubmitted</p>
          </div>
        </Link>

        {/* Rejected */}
        <Link href="/dashboard/apps" className="block group">
          <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)] group-hover:border-(--ink)/40 group-hover:shadow-[4px_4px_0_0_var(--ink)] transition-all">
            <div className="flex items-center justify-between text-rose-700 mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Rejected</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-rose-800">
              {loading ? "-" : stats.rejected}
            </div>
            <p className="text-[11px] font-mono text-rose-700 mt-1">Needs correction</p>
          </div>
        </Link>
      </div>

      {/* Main Grid: Recent Apps (Left) & Publisher Workflow (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Applications Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-medium text-(--ink)">Recent Applications</h2>
              <p className="text-xs text-(--body)">Your latest published and submitted web apps.</p>
            </div>

            {items.length > 0 && (
              <Link
                href="/dashboard/apps"
                className="text-xs font-mono text-(--coral) hover:underline flex items-center gap-1"
              >
                <span>View all ({items.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-(--card) border border-(--line) p-4 animate-pulse"
                />
              ))}
            </div>
          ) : fetchError ? (
            <div className="p-6 rounded-xl bg-(--card) border border-(--line) text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
              <p className="text-xs text-(--body)">{fetchError}</p>
              <Button onClick={handleRetry} variant="outline" className="text-xs font-mono h-8">
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : recentApps.length === 0 ? (
            <div className="py-12 rounded-xl bg-(--card) border-2 border-dashed border-(--line) text-center p-6 space-y-3">
              <FolderOpen className="w-8 h-8 text-(--body-dim) mx-auto" />
              <h3 className="font-display text-base font-medium text-(--ink)">No apps listed yet</h3>
              <p className="text-xs text-(--body) max-w-xs mx-auto">
                Submit your progressive web app to get listed in the Likha Apps public marketplace.
              </p>
              <Link href="/submit">
                <Button className="h-9 px-4 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium rounded-md shadow-none inline-flex items-center gap-1.5 mt-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit App</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-(--card) rounded-xl border border-(--line) p-4 shadow-[2px_2px_0_0_var(--line)] hover:border-(--ink)/40 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* App Icon */}
                    {app.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={app.iconUrl}
                        alt={`${app.title} icon`}
                        className="w-11 h-11 rounded-xl border border-(--line) object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-(--ink) text-(--paper) font-display text-lg font-bold flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_var(--coral)]">
                        {app.title ? app.title.charAt(0).toUpperCase() : "P"}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-sm font-medium text-(--ink) truncate">
                          {app.title}
                        </h4>
                        <StatusBadge status={app.status as PwaStatus} />
                      </div>
                      <p className="text-[11px] font-mono text-(--body-dim) truncate">
                        {app.appUrl}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {app.status === "approved" && app.slug && (
                      <Link href={`/apps/${app.slug}`}>
                        <Button
                          variant="outline"
                          className="h-8 px-2.5 border-(--line) text-(--ink) hover:bg-(--ink-soft) text-xs font-mono"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </Link>
                    )}

                    {app.status === "draft" && (
                      <Link href="/submit">
                        <Button className="h-8 px-2.5 bg-(--ink) text-(--paper) hover:bg-[#1a3d40] text-xs font-mono">
                          Continue
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    )}

                    <Link href="/dashboard/apps">
                      <Button
                        variant="ghost"
                        className="h-8 px-2 text-(--body-dim) hover:text-(--ink) text-xs font-mono"
                        title="Manage in My Apps"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              <div className="pt-2 text-center">
                <Link href="/dashboard/apps">
                  <Button
                    variant="outline"
                    className="w-full h-10 border-(--line) text-(--ink) bg-(--card) hover:bg-(--ink-soft) font-medium text-xs font-mono"
                  >
                    <span>Manage all {items.length} applications in My Apps</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Publisher Guide & Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-[3px_3px_0_0_var(--line)] space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-(--body-dim) pb-2 border-b border-(--line)">
              Developer Actions
            </h3>

            <div className="space-y-2.5">
              <Link href="/submit" className="block">
                <div className="p-3 rounded-lg border border-(--line) bg-(--paper) hover:border-(--ink)/40 hover:bg-(--ink-soft) transition-all flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Rocket className="w-4 h-4 text-(--coral)" />
                    <div>
                      <p className="text-xs font-semibold text-(--ink)">Submit New PWA</p>
                      <p className="text-[11px] text-(--body-dim)">Start the 5-step verification wizard</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-(--body-dim)" />
                </div>
              </Link>

              <Link href="/dashboard/apps" className="block">
                <div className="p-3 rounded-lg border border-(--line) bg-(--paper) hover:border-(--ink)/40 hover:bg-(--ink-soft) transition-all flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <div>
                      <p className="text-xs font-semibold text-(--ink)">Manage My Apps</p>
                      <p className="text-[11px] text-(--body-dim)">View statuses, edit, or unpublish</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-(--body-dim)" />
                </div>
              </Link>

              <Link href="/" className="block">
                <div className="p-3 rounded-lg border border-(--line) bg-(--paper) hover:border-(--ink)/40 hover:bg-(--ink-soft) transition-all flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-sky-700" />
                    <div>
                      <p className="text-xs font-semibold text-(--ink)">Public Directory</p>
                      <p className="text-[11px] text-(--body-dim)">Browse the live marketplace</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-(--body-dim)" />
                </div>
              </Link>
            </div>
          </div>

          {/* Publishing Checklist Card */}
          <div className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-[3px_3px_0_0_var(--line)] space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-(--body-dim) pb-2 border-b border-(--line)">
              PWA Verification Criteria
            </h3>

            <ul className="space-y-2 text-xs text-(--body) font-mono">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Served securely over HTTPS</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Valid web app manifest with icons</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Service worker with offline support</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Responsive for mobile & desktop</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
