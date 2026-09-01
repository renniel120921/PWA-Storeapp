"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getDeveloperSubmissions,
  getDeveloperListings,
  deleteDraftSubmission,
  type DeveloperAppItem,
} from "@/lib/services/pwa.service";
import {
  Plus,
  ArrowRight,
  ExternalLink,
  Eye,
  Trash2,
  Lock,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { PwaStatus } from "@/types";

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading, logout } = useAuth();

  const [items, setItems] = useState<DeveloperAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Load Developer Data cleanly on auth state or refresh trigger
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
        const [submissions, liveListings] = await Promise.all([
          getDeveloperSubmissions(user.uid),
          getDeveloperListings(user.uid),
        ]);

        if (!isCancelled) {
          const liveIds = new Set(liveListings.map((l) => l.id));
          const filteredSubs = submissions.filter((s) => !liveIds.has(s.id));
          setItems([...liveListings, ...filteredSubs]);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load developer dashboard data:", err);
          setFetchError("Unable to load your applications. Please check your connection and try again.");
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

  // Metric Computations (Calculated purely from real data)
  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === "pending").length;
    const approved = items.filter((i) => i.status === "approved").length;
    const drafts = items.filter((i) => i.status === "draft").length;
    const rejected = items.filter((i) => i.status === "rejected").length;

    return { total, pending, approved, drafts, rejected };
  }, [items]);

  // Filtered list by status tab
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((i) => i.status.toLowerCase() === activeFilter.toLowerCase());
  }, [items, activeFilter]);

  // Delete Draft Handler
  const handleDeleteDraft = async (submissionId: string) => {
    if (!user?.uid) return;
    const confirmed = window.confirm("Are you sure you want to delete this draft submission?");
    if (!confirmed) return;

    setDeletingId(submissionId);
    try {
      const res = await deleteDraftSubmission(submissionId, user.uid);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== submissionId));
      } else {
        alert(res.error || "Could not delete draft.");
      }
    } catch {
      alert("Error deleting draft.");
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Auth Loading State (Prevents layout flashing during session hydration)
  // ---------------------------------------------------------------------------
  if (authLoading) {
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
        <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center">
          <div className="w-8 h-8 border-3 border-(--coral) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-1">
            authenticating session
          </span>
          <p className="text-sm font-medium text-(--ink)">
            Loading developer dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Unauthenticated Guard
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
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
        <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-(--ink)/5 flex items-center justify-center mb-6">
            <Lock className="w-6 h-6 text-(--body)" />
          </div>

          <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-2">
            developer dashboard
          </span>

          <h1 className="font-display text-3xl font-medium text-(--ink) tracking-tight mb-3">
            Authentication Required
          </h1>

          <p className="text-sm text-(--body) leading-relaxed mb-8">
            Please log in with your developer account to access your applications and submissions.
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/login">
              <Button className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm">
                Log in to Dashboard
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                variant="outline"
                className="w-full h-11 border-(--line) text-(--ink) bg-transparent hover:bg-(--ink-soft) font-medium text-sm"
              >
                Register as Developer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticated Developer Dashboard View
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
              <span className="font-mono text-xs uppercase px-2.5 py-0.5 rounded bg-(--ink) text-(--paper) font-semibold">
                Developer Portal
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight">
              Welcome back, {profile?.firstName || user?.displayName || "Developer"}
            </h1>
            <p className="text-sm text-(--body) mt-1">
              Manage your submitted progressive web apps, monitor review status, and track live listings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/submit">
              <Button className="h-11 px-6 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm rounded-md shadow-none flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Submit New App</span>
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
            <div className="flex items-center justify-between text-(--body-dim)">
              <span className="text-xs font-mono uppercase tracking-wider">Total Apps</span>
              <Layers className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-semibold text-(--ink)">
              {loading ? "-" : stats.total}
            </div>
            <p className="text-[11px] text-(--body-dim)">Combined listings & drafts</p>
          </div>

          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-xs font-mono uppercase tracking-wider">Pending Review</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-semibold text-amber-900">
              {loading ? "-" : stats.pending}
            </div>
            <p className="text-[11px] text-(--body-dim)">Awaiting moderation</p>
          </div>

          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-mono uppercase tracking-wider">Live / Approved</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-semibold text-emerald-900">
              {loading ? "-" : stats.approved}
            </div>
            <p className="text-[11px] text-(--body-dim)">Publicly discoverable</p>
          </div>

          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-(--body-dim)">
              <span className="text-xs font-mono uppercase tracking-wider">Drafts</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-semibold text-(--ink)">
              {loading ? "-" : stats.drafts}
            </div>
            <p className="text-[11px] text-(--body-dim)">Unsubmitted drafts</p>
          </div>
        </div>

        {/* Applications List Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-medium text-(--ink) tracking-tight">
              My Applications ({filteredItems.length})
            </h2>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {["all", "draft", "pending", "approved", "rejected", "suspended"].map((tab) => {
                const isActive = activeFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-medium capitalize transition-colors border ${
                      isActive
                        ? "bg-(--ink) text-(--paper) border-(--ink)"
                        : "bg-(--card) text-(--body) border-(--line) hover:border-(--ink)/40 hover:text-(--ink)"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
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
            /* Error State */
            <div className="p-8 rounded-xl bg-(--card) border border-(--line) text-center space-y-4">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
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
          ) : filteredItems.length === 0 ? (
            /* Empty State */
            <div className="py-20 rounded-xl bg-(--card) border-2 border-dashed border-(--line) text-center p-8 space-y-5">
              <div className="w-12 h-12 rounded-full bg-(--ink)/5 flex items-center justify-center mx-auto text-(--body)">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-medium text-(--ink) mb-1">
                  {activeFilter === "all"
                    ? "You haven't submitted an app yet."
                    : `No applications found with status "${activeFilter}".`}
                </h3>
                <p className="text-sm text-(--body) max-w-sm mx-auto leading-relaxed">
                  Publish your progressive web app to reach users across mobile and desktop.
                </p>
              </div>

              {activeFilter === "all" && (
                <Link href="/submit">
                  <Button className="h-11 px-6 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm rounded-md shadow-none inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Submit Your First App</span>
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            /* Application Cards List */
            <div className="space-y-4">
              {filteredItems.map((app) => (
                <div
                  key={app.id}
                  className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs hover:border-(--ink)/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* App Icon */}
                    {app.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={app.iconUrl}
                        alt={`${app.title} icon`}
                        className="w-14 h-14 rounded-xl border border-(--line) object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-(--ink) text-(--paper) font-display text-xl font-bold flex items-center justify-center shrink-0">
                        {app.title ? app.title.charAt(0).toUpperCase() : "P"}
                      </div>
                    )}

                    {/* App Identity & Status */}
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-lg font-medium text-(--ink)">
                          {app.title}
                        </h3>
                        <StatusBadge status={app.status as PwaStatus} />
                        <span className="font-mono text-xs px-2 py-0.5 rounded border border-(--ink)/15 text-(--body) bg-(--paper) capitalize">
                          {app.primaryCategory}
                        </span>
                      </div>

                      <p className="text-xs text-(--body) line-clamp-2 max-w-xl">
                        {app.tagline || app.description || "No description provided."}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-(--body-dim) pt-1">
                        <span className="truncate max-w-[200px]">{app.appUrl}</span>
                        {app.isLivePwa && <span className="text-emerald-700 font-semibold">• Live on Directory</span>}
                      </div>

                      {/* Rejection Notes Callout if rejected */}
                      {app.status === "rejected" && app.rejectionReason && (
                        <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                          <strong>Moderation Notes:</strong> {app.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contextual Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    {/* Draft Actions */}
                    {app.status === "draft" && (
                      <>
                        <Button
                          onClick={() => router.push("/submit")}
                          className="h-9 px-4 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium rounded-md flex items-center gap-1.5"
                        >
                          <span>Continue / Submit</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                        <button
                          type="button"
                          disabled={deletingId === app.id}
                          onClick={() => handleDeleteDraft(app.id)}
                          className="p-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-xs transition-colors"
                          title="Delete draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Pending Actions */}
                    {app.status === "pending" && (
                      <span className="text-xs font-mono text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        In Review Queue
                      </span>
                    )}

                    {/* Approved Live Actions */}
                    {app.status === "approved" && (
                      <>
                        <Link href={`/apps/${app.slug || app.id}`}>
                          <Button
                            variant="outline"
                            className="h-9 px-3.5 border-(--line) text-(--ink) hover:bg-(--ink-soft) text-xs font-medium flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Showcase</span>
                          </Button>
                        </Link>
                        {app.appUrl && (
                          <a
                            href={app.appUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button className="h-9 px-3.5 bg-(--ink) hover:bg-(--ink)/90 text-(--paper) text-xs font-medium flex items-center gap-1.5">
                              <span>Launch App</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                      </>
                    )}

                    {/* Rejected Actions */}
                    {app.status === "rejected" && (
                      <Button
                        onClick={() => router.push("/submit")}
                        className="h-9 px-4 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium rounded-md flex items-center gap-1.5"
                      >
                        <span>Fix & Resubmit</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {/* Suspended Actions */}
                    {app.status === "suspended" && (
                      <span className="text-xs font-mono text-red-800 bg-red-100 px-3 py-1.5 rounded-md border border-red-300">
                        Inactive / Suspended
                      </span>
                    )}
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
