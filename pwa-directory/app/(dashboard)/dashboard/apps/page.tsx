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
  RotateCcw,
  RefreshCw,
  FolderOpen,
  XCircle,
  ShieldOff,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { PwaStatus } from "@/types";
import {
  showConfirmDialog,
  showSuccessAlert,
  showErrorAlert,
  showInfoAlert,
  showLoadingAlert,
} from "@/lib/utils/swal";

export default function DeveloperMyAppsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [items, setItems] = useState<DeveloperAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load Developer Data using deduplicated single-source aggregation
  useEffect(() => {
    let isCancelled = false;

    async function fetchApps() {
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
          console.error("Failed to load developer apps:", err);
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

    fetchApps();

    return () => {
      isCancelled = true;
    };
  }, [user, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Filtered list by status tab
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((i) => i.status.toLowerCase() === activeFilter.toLowerCase());
  }, [items, activeFilter]);

  // Counts per status for tab badges
  const counts = useMemo(() => {
    return {
      all: items.length,
      approved: items.filter((i) => i.status === "approved").length,
      pending: items.filter((i) => i.status === "pending").length,
      draft: items.filter((i) => i.status === "draft").length,
      rejected: items.filter((i) => i.status === "rejected").length,
      suspended: items.filter((i) => i.status === "suspended").length,
    };
  }, [items]);

  // Delete Draft Handler with SweetAlert2
  const handleDeleteDraft = async (submissionId: string, title: string) => {
    if (!user?.uid || actionLoadingId) return;

    const confirmed = await showConfirmDialog({
      title: "Delete this draft?",
      text: `Are you sure you want to delete the draft for "${title}"? This cannot be undone.`,
      confirmText: "Delete Draft",
      cancelText: "Cancel",
      isDestructive: true,
    });

    if (!confirmed) return;

    setActionLoadingId(submissionId);
    showLoadingAlert({
      title: "Deleting Draft...",
      text: "Removing draft submission.",
    });

    try {
      const res = await deleteDraftSubmission(submissionId, user.uid);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== submissionId));
        await showSuccessAlert({
          title: "Draft deleted",
          text: `"${title}" has been removed.`,
          timer: 1500,
        });
      } else {
        await showErrorAlert({
          title: "Action failed",
          text: res.error || "Could not delete draft.",
        });
      }
    } catch (err) {
      await showErrorAlert({
        title: "Error",
        error: err,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel Pending Submission Handler
  const handleCancelPending = async (submissionId: string, title: string) => {
    if (!user?.uid || actionLoadingId) return;

    const confirmed = await showConfirmDialog({
      title: "Cancel submission?",
      text: `Withdraw "${title}" from the moderation queue?`,
      confirmText: "Cancel Submission",
      cancelText: "Keep in Queue",
      isDestructive: true,
    });

    if (!confirmed) return;

    setActionLoadingId(submissionId);
    showLoadingAlert({
      title: "Cancelling Submission...",
      text: "Withdrawing submission from moderation queue.",
    });

    try {
      const res = await cancelPendingSubmission(submissionId, user.uid);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== submissionId));
        await showSuccessAlert({
          title: "Submission cancelled",
          text: `"${title}" has been withdrawn from the review queue.`,
          timer: 1800,
        });
      } else {
        await showErrorAlert({
          title: "Action failed",
          text: res.error || "Could not cancel submission.",
        });
      }
    } catch (err) {
      await showErrorAlert({
        title: "Error",
        error: err,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Remove / Unpublish Approved Listing Handler
  const handleRemoveListing = async (slug: string, title: string) => {
    if (!user || actionLoadingId) return;

    const confirmed = await showConfirmDialog({
      title: "Remove this listing?",
      text: "This app will no longer appear in the public directory. Your submission history will remain available.",
      confirmText: "Remove Listing",
      cancelText: "Cancel",
      isDestructive: true,
    });

    if (!confirmed) return;

    setActionLoadingId(slug);
    showLoadingAlert({
      title: "Unpublishing Listing...",
      text: "Removing app from the live marketplace.",
    });

    try {
      const idToken = await user.getIdToken();
      const res = await removeApprovedPwaListing({ slug, idToken });

      if (res.ok) {
        await showSuccessAlert({
          title: "Listing removed",
          text: `"${title}" has been unlisted from the public directory.`,
          timer: 2000,
        });
        setRefreshKey((k) => k + 1);
      } else {
        await showErrorAlert({
          title: "Action failed",
          text: res.error || "Could not remove listing.",
        });
      }
    } catch (err) {
      await showErrorAlert({
        title: "Error",
        error: err,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // View Rejection Reason Modal
  const handleViewRejectionReason = (title: string, reason?: string) => {
    showInfoAlert({
      title: `Moderation Feedback: ${title}`,
      text: reason || "No detailed moderation notes were provided.",
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
              My Applications
            </h1>
            <p className="text-xs text-(--body) leading-relaxed">
              Please log in with your developer account to manage your applications.
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
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-(--line)">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-(--coral)" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-(--body-dim)">
              Developer Workspace
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight">
            My Apps
          </h1>
          <p className="text-xs sm:text-sm text-(--body) mt-0.5">
            Manage your submitted, in-review, published, and draft applications.
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
            title="Refresh applications list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Summary */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-mono text-(--body-dim)">
            Showing {filteredItems.length} of {items.length} application{items.length === 1 ? "" : "s"}
          </p>

          {/* Filter Tabs with Dynamic Counts */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-(--ink)/5 rounded-lg border border-(--line)">
            {[
              { id: "all", label: "All", count: counts.all },
              { id: "approved", label: "Published", count: counts.approved },
              { id: "pending", label: "In Review", count: counts.pending },
              { id: "draft", label: "Drafts", count: counts.draft },
              { id: "rejected", label: "Rejected", count: counts.rejected },
              { id: "suspended", label: "Suspended", count: counts.suspended },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? "bg-(--ink) text-(--paper) border-(--ink) shadow-[2px_2px_0_0_var(--coral)]"
                      : "bg-(--card) text-(--body) border-(--line) hover:border-(--ink)/40 hover:text-(--ink)"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-(--coral) text-white" : "bg-(--ink)/10 text-(--body)"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
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
          /* Applications List */
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

                  {/* App Details */}
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

                    {/* Rejection Notes Callout */}
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

