"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  getSubmissionById,
  executeReviewAction,
  type AdminSubmissionItem,
} from "@/lib/services/admin.service";
import {
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  showConfirmDialog,
  showSuccessAlert,
  showErrorAlert,
  showLoadingAlert,
} from "@/lib/utils/swal";

interface ReviewInspectorProps {
  params: Promise<{ id: string }>;
}

export default function AdminSubmissionInspectorPage({
  params,
}: ReviewInspectorProps) {
  const { id } = use(params);
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const [submission, setSubmission] = useState<AdminSubmissionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [decisionResult, setDecisionResult] = useState<{
    type: "approved" | "rejected";
    slug?: string;
    message: string;
  } | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Load Submission Document
  useEffect(() => {
    let isCancelled = false;

    async function fetchDoc() {
      if (!user?.uid || !isAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const item = await getSubmissionById(id);
        if (!isCancelled) {
          if (!item) {
            setFetchError(`Submission with ID "${id}" was not found.`);
          } else {
            setSubmission(item);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error fetching submission details:", err);
          setFetchError("Failed to load submission. Check administrative permissions.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchDoc();

    return () => {
      isCancelled = true;
    };
  }, [id, user, isAdmin, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleApprove = async () => {
    if (!user || submitting) return;

    const confirmed = await showConfirmDialog({
      title: "Approve this application?",
      text: `"${submission?.title}" will become publicly visible in the Likha Apps directory.`,
      confirmText: "Approve App",
      cancelText: "Cancel",
      icon: "question",
    });

    if (!confirmed) return;

    setSubmitting(true);
    setActionError(null);
    showLoadingAlert({
      title: "Publishing Application...",
      text: "Creating live directory listing and updating review status.",
    });

    try {
      const idToken = await user.getIdToken();
      const res = await executeReviewAction({
        submissionId: id,
        action: "approve",
        idToken,
      });

      if (res.ok) {
        setDecisionResult({
          type: "approved",
          slug: res.slug,
          message: "Application approved successfully and published to the live directory.",
        });
        setSubmission((prev) => (prev ? { ...prev, status: "approved" } : null));
        await showSuccessAlert({
          title: "Application Approved!",
          text: `"${submission?.title}" is now live in the Likha Apps directory.`,
          timer: 2000,
        });
      } else {
        setActionError(res.error || "Failed to approve application.");
        await showErrorAlert({
          title: "Approval Failed",
          error: res.error || "Failed to approve application.",
        });
      }
    } catch (err) {
      const msg = "An unexpected error occurred while approving application.";
      setActionError(msg);
      await showErrorAlert({
        title: "Approval Error",
        error: err,
        text: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      await showErrorAlert({
        title: "Rejection Reason Required",
        text: "Please provide a detailed rejection reason of at least 5 characters.",
      });
      return;
    }

    setSubmitting(true);
    setActionError(null);
    showLoadingAlert({
      title: "Rejecting Submission...",
      text: "Recording review feedback and updating status.",
    });

    try {
      const idToken = await user.getIdToken();
      const res = await executeReviewAction({
        submissionId: id,
        action: "reject",
        reason: trimmedReason,
        idToken,
      });

      if (res.ok) {
        setDecisionResult({
          type: "rejected",
          message: "Submission rejected and feedback recorded for developer.",
        });
        setSubmission((prev) =>
          prev
            ? {
                ...prev,
                status: "rejected",
                rejectionReason: trimmedReason,
              }
            : null
        );
        setRejectModalOpen(false);
        await showSuccessAlert({
          title: "Submission Rejected",
          text: "The developer has been notified and can address the review issues.",
          timer: 2000,
        });
      } else {
        setActionError(res.error || "Failed to reject submission.");
        await showErrorAlert({
          title: "Rejection Failed",
          error: res.error || "Failed to reject submission.",
        });
      }
    } catch (err) {
      const msg = "An unexpected error occurred while rejecting submission.";
      setActionError(msg);
      await showErrorAlert({
        title: "Rejection Error",
        error: err,
        text: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="font-display text-2xl font-medium text-(--ink) tracking-tight mb-1">
              Administrator Access Restricted
            </h1>
            <p className="text-xs text-(--body) leading-relaxed">
              Elevated administrator privileges are required to inspect submissions.
            </p>
          </div>

          <Link href="/">
            <Button className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm">
              Return to Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-(--ink)/10 rounded animate-pulse" />
        <div className="h-44 rounded-xl bg-(--card) border border-(--line) animate-pulse" />
        <div className="h-96 rounded-xl bg-(--card) border border-(--line) animate-pulse" />
      </div>
    );
  }

  // Error state
  if (fetchError || !submission) {
    return (
      <div className="max-w-md mx-auto bg-(--card) rounded-xl border border-(--line) p-8 text-center space-y-4 shadow-[3px_3px_0_0_var(--line)]">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="font-display text-xl font-medium text-(--ink)">
          Inspection Error
        </h2>
        <p className="text-xs text-(--body)">{fetchError || "Submission could not be located."}</p>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleRetry}
            variant="outline"
            className="flex-1 border-(--line) text-xs font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Retry
          </Button>
          <Link href="/admin/review" className="flex-1">
            <Button className="w-full bg-(--ink) text-white text-xs font-mono">
              Back to Queue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const audit = submission.automatedAuditResult;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/review"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-(--body) hover:text-(--ink) transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Moderation Queue</span>
        </Link>

        <span className="font-mono text-[11px] text-(--body-dim)">
          ID: {submission.id}
        </span>
      </div>

      {/* Hero Inspection Card */}
      <div className="bg-(--card) rounded-xl border border-(--line) p-6 sm:p-8 shadow-[4px_4px_0_0_var(--line)]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-5 flex-1 min-w-0">
            {/* Icon */}
            {submission.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={submission.iconUrl}
                alt={`${submission.title} icon`}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-(--line) object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-(--ink) text-(--paper) font-display text-2xl font-bold flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_var(--coral)]">
                {submission.title ? submission.title.charAt(0).toUpperCase() : "P"}
              </div>
            )}

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={submission.status} />
                <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded border border-(--line) text-(--body) bg-(--paper) capitalize">
                  {submission.primaryCategory}
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-(--ink-soft) text-(--ink) capitalize">
                  {submission.pricing || "Free"}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight truncate">
                {submission.title}
              </h1>

              <p className="text-xs sm:text-sm text-(--body) max-w-xl leading-relaxed">
                {submission.tagline || submission.description}
              </p>

              {submission.tags && submission.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {submission.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] text-(--body-dim) bg-(--ink-soft) px-2 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Manual Testing CTA */}
          <div className="flex flex-col gap-2 shrink-0 self-stretch sm:self-auto">
            <a
              href={submission.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full sm:w-auto h-10 px-5 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium rounded-md shadow-none flex items-center justify-center gap-2">
                <span>Open App for Manual Testing</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
            <span className="text-[10px] font-mono text-(--body-dim) text-center">
              Opens in secure tab
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Full Description Section */}
          <section className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-[3px_3px_0_0_var(--line)] space-y-2.5">
            <h2 className="font-display text-lg font-medium text-(--ink)">
              Submitted Description
            </h2>
            <div className="text-xs sm:text-sm text-(--body) leading-relaxed whitespace-pre-line">
              {submission.description || "No full description provided."}
            </div>
          </section>

          {/* Screenshots Gallery */}
          {submission.screenshots && submission.screenshots.length > 0 && (
            <section className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-[3px_3px_0_0_var(--line)] space-y-3.5">
              <h2 className="font-display text-lg font-medium text-(--ink)">
                Submitted Screenshots ({submission.screenshots.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {submission.screenshots.map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={url}
                    alt={`Screenshot ${idx + 1}`}
                    className="rounded-lg border border-(--line) w-full h-40 object-cover"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Automated PWA Audit Results Breakdown */}
          <section className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-[3px_3px_0_0_var(--line)] space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h2 className="font-display text-lg font-medium text-(--ink)">
                Automated Verification Findings
              </h2>
            </div>

            {audit ? (
              <div className="divide-y divide-(--line) border border-(--line) rounded-lg overflow-hidden text-xs">
                <div className="p-3.5 flex items-center justify-between">
                  <span>HTTPS & SSL Security</span>
                  <span className={audit.https ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                    {audit.https ? "✓ Valid HTTPS" : "✗ Insecure"}
                  </span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span>Web App Manifest Presence</span>
                  <span className={audit.manifestFound ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                    {audit.manifestFound ? "✓ Detected" : "✗ Missing"}
                  </span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span>Service Worker Implementation</span>
                  <span className={audit.serviceWorkerDetected ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                    {audit.serviceWorkerDetected ? "✓ Registered" : "✗ Not Detected"}
                  </span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span>Standard App Icons (192 / 512)</span>
                  <span className={audit.has192Icon && audit.has512Icon ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                    {audit.has192Icon && audit.has512Icon ? "✓ Valid Icons" : "• Incomplete Sizes"}
                  </span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span>Maskable Adaptive Icon</span>
                  <span className={audit.hasMaskableIcon ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                    {audit.hasMaskableIcon ? "✓ Maskable Icon" : "• Standard Only"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-(--body-dim)">
                No automated audit telemetry recorded for this submission.
              </p>
            )}
          </section>
        </div>

        {/* Sidebar Column (1/3) */}
        <div className="space-y-6">
          {/* Developer Identity Card */}
          <section className="bg-(--card) rounded-xl border border-(--line) p-5 sm:p-6 shadow-[3px_3px_0_0_var(--line)] space-y-3">
            <h3 className="font-display text-base font-medium text-(--ink)">
              Developer Profile
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-mono text-[10px] uppercase text-(--body-dim) block">
                  Author Name
                </span>
                <span className="font-medium text-(--ink)">
                  {submission.developerName || "Anonymous Developer"}
                </span>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase text-(--body-dim) block">
                  Contact Email
                </span>
                <span className="text-(--ink)">{submission.developerEmail}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase text-(--body-dim) block">
                  Developer UID
                </span>
                <span className="font-mono text-[10px] text-(--body-dim) break-all">
                  {submission.developerId}
                </span>
              </div>
            </div>
          </section>

          {/* Manifest URLs & Raw Metadata */}
          <section className="bg-(--card) rounded-xl border border-(--line) p-5 sm:p-6 shadow-[3px_3px_0_0_var(--line)] space-y-3">
            <h3 className="font-display text-base font-medium text-(--ink)">
              Application Links
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-mono text-[10px] uppercase text-(--body-dim) block">
                  Target App URL
                </span>
                <a
                  href={submission.appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--coral) hover:underline break-all"
                >
                  {submission.appUrl}
                </a>
              </div>
              {submission.manifestUrl && (
                <div>
                  <span className="font-mono text-[10px] uppercase text-(--body-dim) block">
                    Manifest URL
                  </span>
                  <a
                    href={submission.manifestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--coral) hover:underline break-all"
                  >
                    {submission.manifestUrl}
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Moderation Decision Action Box */}
          <section className="bg-(--card) rounded-xl border border-(--line) p-5 sm:p-6 shadow-[4px_4px_0_0_var(--line)] space-y-4">
            <h3 className="font-display text-base font-medium text-(--ink)">
              Moderation Decision
            </h3>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {actionError}
              </div>
            )}

            {/* Decision Success Banner */}
            {decisionResult && (
              <div
                className={`p-4 rounded-lg border text-xs space-y-2.5 ${
                  decisionResult.type === "approved"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {decisionResult.type === "approved" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  )}
                  <span>{decisionResult.message}</span>
                </div>

                {decisionResult.slug && (
                  <Link href={`/apps/${decisionResult.slug}`}>
                    <Button className="w-full h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-md flex items-center justify-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Live Showcase</span>
                    </Button>
                  </Link>
                )}

                <Link href="/admin/review">
                  <Button
                    variant="outline"
                    className="w-full h-9 border-(--line) text-(--ink) bg-white hover:bg-(--ink-soft) font-medium text-xs rounded-md mt-1"
                  >
                    Return to Moderation Queue
                  </Button>
                </Link>
              </div>
            )}

            {/* Pending State Controls */}
            {!decisionResult && submission.status === "pending" && !rejectModalOpen && (
              <div className="space-y-2.5">
                <Button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="w-full h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Decision...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Publish App</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setActionError(null);
                    setRejectModalOpen(true);
                  }}
                  disabled={submitting}
                  variant="outline"
                  className="w-full h-10 border-rose-300 text-rose-700 hover:bg-rose-50 font-medium text-xs flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject with Feedback</span>
                </Button>
              </div>
            )}

            {/* Reject Feedback Form */}
            {!decisionResult && rejectModalOpen && (
              <form onSubmit={handleReject} className="space-y-3 pt-1">
                <label className="text-[11px] font-mono text-(--body-dim) block">
                  Rejection Feedback (Required, min 5 chars):
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. App URL returns 404, or manifest icon sizes are missing..."
                  className="w-full p-2.5 text-xs rounded-lg border border-rose-300 bg-white text-(--ink) outline-none focus:border-rose-500 font-mono"
                  required
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-9 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium"
                  >
                    {submitting ? "Rejecting..." : "Confirm Reject"}
                  </Button>
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={() => setRejectModalOpen(false)}
                    variant="outline"
                    className="h-9 px-3 border-(--line) text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Already Approved Display */}
            {!decisionResult && submission.status === "approved" && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Live in Public Directory</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  This PWA is approved and discoverable in the marketplace.
                </p>
              </div>
            )}

            {/* Already Rejected Display */}
            {!decisionResult && submission.status === "rejected" && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Submission Rejected</span>
                </div>
                {submission.rejectionReason && (
                  <p className="text-[11px] text-rose-700">
                    <strong>Reason:</strong> {submission.rejectionReason}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
