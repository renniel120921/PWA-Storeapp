"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  getPendingSubmissions,
  getAdminOverviewStats,
  type AdminSubmissionItem,
  type AdminOverviewStats,
} from "@/lib/services/admin.service";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Search,
  RefreshCw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function AdminOverviewPage() {
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [pendingItems, setPendingItems] = useState<AdminSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load Admin Portal Data
  useEffect(() => {
    let isCancelled = false;

    async function fetchAdminData() {
      if (!user?.uid || !isAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const [overviewStats, pendingList] = await Promise.all([
          getAdminOverviewStats(),
          getPendingSubmissions(),
        ]);

        if (!isCancelled) {
          setStats(overviewStats);
          setPendingItems(pendingList);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading admin overview data:", err);
          setFetchError("Unable to load moderation queue. Please check database permissions.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchAdminData();

    return () => {
      isCancelled = true;
    };
  }, [user, isAdmin, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // 403 Forbidden Access Guard
  // ---------------------------------------------------------------------------
  if (!authLoading && (!isAuthenticated || !isAdmin)) {
    return (
      <div className="py-20 flex flex-col justify-center items-center">
        <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
              403 forbidden
            </span>
            <h1 className="font-display text-2xl font-medium text-(--ink) tracking-tight mt-3 mb-1">
              Administrator Access Restricted
            </h1>
            <p className="text-xs text-(--body) leading-relaxed">
              This area is strictly restricted to authorized platform administrators. Your current account ({user?.email || "unauthenticated"}) does not have administrative privileges.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link href="/">
              <Button className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm">
                Return to Directory
              </Button>
            </Link>
            <Link href="/admin-bootstrap">
              <Button
                variant="outline"
                className="w-full h-11 border-(--line) text-(--ink) bg-transparent hover:bg-(--ink-soft) font-medium text-sm"
              >
                Initial Admin Bootstrap
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticated Admin Overview Content
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-(--line)">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-700" />
              Admin Moderation
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight">
            Moderation & Queue Overview
          </h1>
          <p className="text-xs sm:text-sm text-(--body) mt-1">
            Review developer submissions, audit manifest verification data, and manage directory listings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={loading}
            className="h-10 px-3 border-(--line) text-(--body) hover:text-(--ink) bg-(--card) hover:bg-(--ink-soft) text-xs font-mono"
            aria-label="Refresh admin data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline ml-1.5">Refresh</span>
          </Button>

          <Link href="/admin/review">
            <Button className="h-10 px-5 bg-(--ink) hover:bg-(--ink)/90 text-(--paper) font-medium text-xs font-mono rounded-md shadow-none flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Full Review Queue</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-[3px_3px_0_0_var(--line)] space-y-1.5">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-mono uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="font-display text-3xl font-semibold text-amber-900">
            {loading ? "-" : stats?.pendingCount ?? 0}
          </div>
          <p className="text-[11px] text-(--body-dim)">Awaiting manual review</p>
        </div>

        {/* Approved */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-[3px_3px_0_0_var(--line)] space-y-1.5">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-mono uppercase tracking-wider">Approved Apps</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="font-display text-3xl font-semibold text-emerald-900">
            {loading ? "-" : stats?.approvedCount ?? 0}
          </div>
          <p className="text-[11px] text-(--body-dim)">Live in directory</p>
        </div>

        {/* Rejected */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-[3px_3px_0_0_var(--line)] space-y-1.5">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-mono uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="font-display text-3xl font-semibold text-rose-900">
            {loading ? "-" : stats?.rejectedCount ?? 0}
          </div>
          <p className="text-[11px] text-(--body-dim)">Submissions returned</p>
        </div>

        {/* Total Submissions */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-[3px_3px_0_0_var(--line)] space-y-1.5">
          <div className="flex items-center justify-between text-(--body-dim)">
            <span className="text-[11px] font-mono uppercase tracking-wider">Total Evaluated</span>
            <Check className="w-4 h-4" />
          </div>
          <div className="font-display text-3xl font-semibold text-(--ink)">
            {loading ? "-" : stats?.totalSubmissions ?? 0}
          </div>
          <p className="text-[11px] text-(--body-dim)">Historical total</p>
        </div>
      </div>

      {/* Pending Reviews Table / List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-medium text-(--ink) tracking-tight">
              Action Required: Pending Reviews ({pendingItems.length})
            </h2>
            <p className="text-xs text-(--body-dim) mt-0.5">
              Submissions submitted by developers requiring manifest verification and editorial approval.
            </p>
          </div>

          {pendingItems.length > 0 && (
            <Link
              href="/admin/review"
              className="text-xs font-mono text-(--coral) hover:underline inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Content States */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-(--card) border border-(--line) p-5 animate-pulse"
              />
            ))}
          </div>
        ) : fetchError ? (
          <div className="p-8 rounded-xl bg-(--card) border border-(--line) text-center space-y-4 shadow-[3px_3px_0_0_var(--line)]">
            <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
            <p className="text-sm text-(--body)">{fetchError}</p>
            <Button
              onClick={handleRetry}
              variant="outline"
              className="border-(--line) text-xs font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Retry
            </Button>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="py-16 rounded-xl bg-(--card) border-2 border-dashed border-(--line) text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-medium text-(--ink)">
              Queue is completely clear!
            </h3>
            <p className="text-xs text-(--body) max-w-sm mx-auto leading-relaxed">
              No developer submissions are currently pending review. All submissions have been evaluated.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-[3px_3px_0_0_var(--line)] hover:border-(--ink)/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {item.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.iconUrl}
                      alt={`${item.title} icon`}
                      className="w-12 h-12 rounded-xl border border-(--line) object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-(--ink) text-(--paper) font-display text-lg font-bold flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_var(--coral)]">
                      {item.title.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-medium text-(--ink) truncate">
                        {item.title}
                      </h3>
                      <StatusBadge status="pending" />
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-(--line) text-(--body) bg-(--paper) capitalize">
                        {item.primaryCategory}
                      </span>
                    </div>

                    <p className="text-xs text-(--body) line-clamp-1 max-w-xl">
                      {item.tagline || item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-(--body-dim) pt-0.5">
                      <span>Dev: {item.developerEmail || "Anonymous"}</span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{item.appUrl}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-(--line)">
                  <Link href={`/admin/review/${item.id}`}>
                    <Button className="h-9 px-4 bg-(--ink) hover:bg-[#1a3d40] text-(--paper) font-medium text-xs font-mono rounded-md shadow-none flex items-center gap-1.5">
                      <span>Inspect & Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
