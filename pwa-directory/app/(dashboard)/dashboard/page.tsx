"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  getDeveloperDashboardApps,
  deleteDraftSubmission,
  cancelPendingSubmission,
  removeApprovedPwaListing,
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
  RefreshCw,
  FolderOpen,
  XCircle,
  ShieldOff,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { PwaStatus } from "@/types";
import Swal from "sweetalert2";

export default function DeveloperDashboardPage() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();

  const [items, setItems] = useState<DeveloperAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
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
            "Unable to load your applications. Please check your connection and try again."
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

  // Filtered list by status tab
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((i) => i.status.toLowerCase() === activeFilter.toLowerCase());
  }, [items, activeFilter]);

  // Delete Draft Handler with SweetAlert2
  const handleDeleteDraft = async (submissionId: string, title: string) => {
    if (!user?.uid || actionLoadingId) return;

    const result = await Swal.fire({
      title: "Delete this draft?",
      text: `Are you sure you want to delete the draft for "${title}"? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete Draft",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
      customClass: { popup: "rounded-xl" },
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(submissionId);
    try {
      const res = await deleteDraftSubmission(submissionId, user.uid);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== submissionId));
        await Swal.fire({
          icon: "success",
          title: "Draft deleted",
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: "rounded-xl" },
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Action failed",
          text: res.error || "Could not delete draft.",
          customClass: { popup: "rounded-xl" },
        });
      }
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "An unexpected network error occurred.",
        customClass: { popup: "rounded-xl" },
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel Pending Submission Handler
  const handleCancelPending = async (submissionId: string, title: string) => {
    if (!user?.uid || actionLoadingId) return;

    const result = await Swal.fire({
      title: "Cancel submission?",
      text: `Withdraw "${title}" from the moderation queue?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cancel Submission",
      cancelButtonText: "Keep in Queue",
      confirmButtonColor: "#e11d48",
      customClass: { popup: "rounded-xl" },
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(submissionId);
    try {
      const res = await cancelPendingSubmission(submissionId, user.uid);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== submissionId));
        await Swal.fire({
          icon: "info",
          title: "Submission cancelled",
          text: "Your submission has been withdrawn from the review queue.",
          timer: 1800,
          showConfirmButton: false,
          customClass: { popup: "rounded-xl" },
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Action failed",
          text: res.error || "Could not cancel submission.",
          customClass: { popup: "rounded-xl" },
        });
      }
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "An unexpected network error occurred.",
        customClass: { popup: "rounded-xl" },
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Remove / Unpublish Approved Listing Handler
  const handleRemoveListing = async (slug: string, title: string) => {
    if (!user || actionLoadingId) return;

    const result = await Swal.fire({
      title: "Remove this listing?",
      text: "The app will no longer be publicly listed. Your submission history will remain available.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove Listing",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
      customClass: { popup: "rounded-xl" },
    });

    if (!result.isConfirmed) return;

    setActionLoadingId(slug);
    try {
      const idToken = await user.getIdToken();
      const res = await removeApprovedPwaListing({ slug, idToken });

      if (res.ok) {
        await Swal.fire({
          icon: "success",
          title: "Listing removed",
          text: `"${title}" has been unlisted from the public directory.`,
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: "rounded-xl" },
        });
        setRefreshKey((k) => k + 1);
      } else {
        await Swal.fire({
          icon: "error",
          title: "Action failed",
          text: res.error || "Could not remove listing.",
          customClass: { popup: "rounded-xl" },
        });
      }
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "An unexpected network error occurred.",
        customClass: { popup: "rounded-xl" },
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // View Rejection Reason Modal
  const handleViewRejectionReason = (title: string, reason?: string) => {
    Swal.fire({
      title: `Moderation Feedback: ${title}`,
      text: reason || "No detailed moderation notes were provided.",
      icon: "info",
      confirmButtonText: "Close",
      customClass: { popup: "rounded-xl" },
    });
  };

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
              Please log in with your developer account to manage your listings.
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
          <p className="text-xs text-(--body) mt-0.5">
            Manage your progressive web applications, review statuses, and track live listings.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)]">
          <div className="flex items-center justify-between text-(--body-dim) mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Total Apps</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-(--ink)">
            {loading ? "-" : stats.total}
          </div>
          <p className="text-[11px] font-mono text-(--body-dim) mt-1">Across all states</p>
        </div>

        {/* Live on Directory */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)]">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-800">
            {loading ? "-" : stats.approved}
          </div>
          <p className="text-[11px] font-mono text-emerald-700 mt-1">Published live</p>
        </div>

        {/* In Review */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)]">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">In Review</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-amber-800">
            {loading ? "-" : stats.pending}
          </div>
          <p className="text-[11px] font-mono text-amber-700 mt-1">Pending approval</p>
        </div>

        {/* Drafts */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)]">
          <div className="flex items-center justify-between text-(--body-dim) mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Drafts</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-(--ink)">
            {loading ? "-" : stats.drafts}
          </div>
          <p className="text-[11px] font-mono text-(--body-dim) mt-1">Unsubmitted</p>
        </div>

        {/* Rejected */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-4 sm:p-5 shadow-[3px_3px_0_0_var(--line)]">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Rejected</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-rose-800">
            {loading ? "-" : stats.rejected}
          </div>
          <p className="text-[11px] font-mono text-rose-700 mt-1">Needs correction</p>
        </div>
      </div>

      {/* Applications Section Header & Filter Tabs */}
      <div id="apps" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-medium text-(--ink)">My Applications</h2>
            <p className="text-xs text-(--body)">
              View live listings, continue drafts, and track moderation progress.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-(--ink)/5 rounded-lg border border-(--line)">
            {[
              { id: "all", label: "All" },
              { id: "approved", label: "Approved" },
              { id: "pending", label: "Pending" },
              { id: "draft", label: "Drafts" },
              { id: "rejected", label: "Rejected" },
              { id: "suspended", label: "Suspended" },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all border ${
                    isActive
                      ? "bg-(--ink) text-(--paper) border-(--ink) shadow-[2px_2px_0_0_var(--coral)]"
                      : "bg-(--card) text-(--body) border-(--line) hover:border-(--ink)/40 hover:text-(--ink)"
                  }`}
                >
                  {tab.label}
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
          <div className="p-8 rounded-xl bg-(--card) border border-(--line) text-center space-y-4 shadow-[3px_3px_0_0_var(--line)]">
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
          <div className="py-16 rounded-xl bg-(--card) border-2 border-dashed border-(--line) text-center p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-(--ink)/5 flex items-center justify-center mx-auto text-(--body)">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-medium text-(--ink) mb-1">
                {activeFilter === "all"
                  ? "You have not submitted an app yet."
                  : `No applications found with status "${activeFilter}".`}
              </h3>
              <p className="text-xs text-(--body) max-w-sm mx-auto leading-relaxed">
                Publish your progressive web app to reach users across mobile and desktop.
              </p>
            </div>

            {activeFilter === "all" && (
              <Link href="/submit">
                <Button className="h-10 px-5 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-xs rounded-md shadow-none inline-flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Submit Your First App</span>
                </Button>
              </Link>
            )}
          </div>
        ) : (
          /* Application Cards List */
          <div className="space-y-3.5">
            {filteredItems.map((app) => (
              <div
                key={app.id}
                className="bg-(--card) rounded-xl border border-(--line) p-5 sm:p-6 shadow-[3px_3px_0_0_var(--line)] hover:border-(--ink)/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* App Icon */}
                  {app.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={app.iconUrl}
                      alt={`${app.title} icon`}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-(--line) object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-(--ink) text-(--paper) font-display text-xl font-bold flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_var(--coral)]">
                      {app.title ? app.title.charAt(0).toUpperCase() : "P"}
                    </div>
                  )}

                  {/* App Identity & Status */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base sm:text-lg font-medium text-(--ink) truncate">
                        {app.title}
                      </h3>
                      <StatusBadge status={app.status as PwaStatus} />
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-(--line) text-(--body) bg-(--paper) capitalize">
                        {app.primaryCategory}
                      </span>
                    </div>

                    <p className="text-xs text-(--body) line-clamp-2 max-w-xl">
                      {app.tagline || app.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-(--body-dim) pt-0.5">
                      <span className="truncate max-w-[220px]">{app.appUrl}</span>
                      {app.status === "approved" && (
                        <span className="text-emerald-700 font-semibold">• Live on Directory</span>
                      )}
                      {app.status === "suspended" && (
                        <span className="text-amber-700 font-semibold">• Unlisted from Directory</span>
                      )}
                    </div>

                    {/* Rejection Notes Callout if rejected */}
                    {app.status === "rejected" && app.rejectionReason && (
                      <div className="mt-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                        <strong>Moderation Notes:</strong> {app.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status-Specific Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-(--line)">
                  {/* APPROVED ACTIONS */}
                  {app.status === "approved" && (
                    <>
                      {app.slug && (
                        <Link href={`/apps/${app.slug}`}>
                          <Button
                            variant="outline"
                            className="h-9 px-3 border-(--line) text-(--ink) hover:bg-(--ink-soft) text-xs font-mono"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Directory Listing
                          </Button>
                        </Link>
                      )}

                      {app.appUrl && (
                        <a
                          href={app.appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button
                            variant="outline"
                            className="h-9 px-3 border-(--line) text-(--body) hover:text-(--ink) text-xs font-mono"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Launch App
                          </Button>
                        </a>
                      )}

                      <Button
                        variant="ghost"
                        onClick={() =>
                          handleRemoveListing(app.slug || app.id, app.title)
                        }
                        disabled={actionLoadingId === (app.slug || app.id)}
                        className="h-9 px-3 text-rose-700 hover:text-rose-800 hover:bg-rose-50 text-xs font-mono"
                        title="Unpublish this app from the public directory"
                      >
                        <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
                        <span>Remove Listing</span>
                      </Button>
                    </>
                  )}

                  {/* DRAFT ACTIONS */}
                  {app.status === "draft" && (
                    <>
                      <Link href="/submit">
                        <Button className="h-9 px-3.5 bg-(--ink) text-(--paper) hover:bg-[#1a3d40] text-xs font-mono">
                          <span>Continue Draft</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteDraft(app.id, app.title)}
                        disabled={actionLoadingId === app.id}
                        className="h-9 px-2.5 text-rose-700 hover:text-rose-800 hover:bg-rose-50 text-xs font-mono"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}

                  {/* PENDING ACTIONS */}
                  {app.status === "pending" && (
                    <>
                      <div className="text-[11px] font-mono text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        In Review Queue
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() => handleCancelPending(app.id, app.title)}
                        disabled={actionLoadingId === app.id}
                        className="h-9 px-3 text-rose-700 hover:text-rose-800 hover:bg-rose-50 text-xs font-mono"
                        title="Withdraw submission from moderation queue"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        <span>Cancel Submission</span>
                      </Button>
                    </>
                  )}

                  {/* REJECTED ACTIONS */}
                  {app.status === "rejected" && (
                    <>
                      {app.rejectionReason && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleViewRejectionReason(app.title, app.rejectionReason)
                          }
                          className="h-9 px-3 border-(--line) text-(--body) hover:text-(--ink) text-xs font-mono"
                        >
                          <Info className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                          View Reason
                        </Button>
                      )}

                      <Link href="/submit">
                        <Button className="h-9 px-3.5 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-mono">
                          <span>Fix & Resubmit</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </>
                  )}

                  {/* SUSPENDED ACTIONS */}
                  {app.status === "suspended" && (
                    <div className="text-[11px] font-mono text-stone-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-300">
                      Listing Unpublished
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
