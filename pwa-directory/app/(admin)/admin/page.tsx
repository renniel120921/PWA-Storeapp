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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function AdminOverviewPage() {
  const { user, isAuthenticated, isAdmin, loading: authLoading, logout } = useAuth();

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
      <div
        className="min-h-screen bg-(--paper) text-(--ink) flex flex-col justify-center items-center px-6 py-20"
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
            {isAuthenticated && (
              <Button
                variant="outline"
                onClick={() => logout()}
                className="w-full h-11 border-(--line) text-(--ink) bg-transparent hover:bg-(--ink-soft) font-medium text-sm"
              >
                Sign out
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticated Admin Portal View
  // ---------------------------------------------------------------------------
  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink) py-12 px-6"
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
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-(--line)">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 font-mono text-xs uppercase px-2.5 py-0.5 rounded bg-(--ink) text-(--paper) font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-(--gold)" />
                Admin Moderation Portal
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight">
              Queue & Inspection Overview
            </h1>
            <p className="text-sm text-(--body) mt-1">
              Review developer submissions, audit manifest verification data, and moderate live directory listings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/review">
              <Button className="h-11 px-5 bg-(--ink) hover:bg-(--ink)/90 text-(--paper) font-medium text-xs font-mono rounded-md shadow-none flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>Full Review Queue</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => logout()}
              className="h-11 px-4 border-(--line) text-(--body) hover:text-(--ink) bg-transparent hover:bg-(--ink-soft) text-xs font-mono"
            >
              Sign out
            </Button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-xs font-mono uppercase tracking-wider">Pending Review</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-semibold text-amber-900">
              {loading ? "-" : stats?.pendingCount ?? 0}
            </div>
            <p className="text-[11px] text-(--body-dim)">Awaiting manual audit</p>
          </div>

          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-mono uppercase tracking-wider">Approved Apps</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-semibold text-emerald-900">
              {loading ? "-" : stats?.approvedCount ?? 0}
            </div>
            <p className="text-[11px] text-(--body-dim)">Live in marketplace</p>
          </div>

          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-xs font-mono uppercase tracking-wider">Rejected</span>
              <XCircle className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-semibold text-rose-900">
              {loading ? "-" : stats?.rejectedCount ?? 0}
            </div>
            <p className="text-[11px] text-(--body-dim)">Needs developer fixes</p>
          </div>

          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-(--body-dim)">
              <span className="text-xs font-mono uppercase tracking-wider">Suspended</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-semibold text-(--ink)">
              {loading ? "-" : stats?.suspendedCount ?? 0}
            </div>
            <p className="text-[11px] text-(--body-dim)">Delisted applications</p>
          </div>
        </div>

        {/* Priority Pending Queue Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-medium text-(--ink) tracking-tight">
                Pending Moderation Queue ({pendingItems.length})
              </h2>
              <p className="text-xs text-(--body) mt-0.5">
                Submissions awaiting manual testing and review decision.
              </p>
            </div>

            <Link
              href="/admin/review"
              className="text-xs font-mono font-medium text-(--coral) hover:underline inline-flex items-center gap-1"
            >
              <span>View all queues</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Loading Skeleton */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-(--card) border border-(--line) p-6 animate-pulse"
                />
              ))}
            </div>
          ) : fetchError ? (
            /* Error Alert */
            <div className="p-8 rounded-xl bg-(--card) border border-(--line) text-center space-y-4">
              <p className="text-sm text-rose-700">{fetchError}</p>
              <Button
                onClick={handleRetry}
                variant="outline"
                className="border-(--line) text-xs font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                Retry Loading
              </Button>
            </div>
          ) : pendingItems.length === 0 ? (
            /* Queue Clear Empty State */
            <div className="py-16 rounded-xl bg-(--card) border-2 border-dashed border-(--line) text-center p-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-medium text-(--ink) mb-1">
                  Queue is clear!
                </h3>
                <p className="text-sm text-(--body) max-w-sm mx-auto leading-relaxed">
                  There are no pending submissions awaiting review at this time.
                </p>
              </div>
            </div>
          ) : (
            /* Pending Cards List */
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs hover:border-(--ink)/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    {item.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.iconUrl}
                        alt={`${item.title} icon`}
                        className="w-14 h-14 rounded-xl border border-(--line) object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-(--ink) text-(--paper) font-display text-xl font-bold flex items-center justify-center shrink-0">
                        {item.title ? item.title.charAt(0).toUpperCase() : "P"}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-lg font-medium text-(--ink)">
                          {item.title}
                        </h3>
                        <StatusBadge status={item.status} />
                        <span className="font-mono text-xs px-2 py-0.5 rounded border border-(--ink)/15 text-(--body) bg-(--paper) capitalize">
                          {item.primaryCategory}
                        </span>
                      </div>

                      <p className="text-xs text-(--body) line-clamp-1 max-w-xl">
                        {item.tagline || item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-(--body-dim) pt-1">
                        <span>Developer: <strong className="text-(--ink)">{item.developerName}</strong></span>
                        <span>•</span>
                        <span>{item.developerEmail}</span>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{item.appUrl}</span>
                      </div>
                    </div>
                  </div>

                  {/* Review Action */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <Link href={`/admin/review/${item.id}`}>
                      <Button className="h-10 px-5 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium rounded-md shadow-none flex items-center gap-1.5">
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
    </div>
  );
}
