"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminSubmissions,
  type AdminSubmissionItem,
} from "@/lib/services/admin.service";
import {
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Search,
  RotateCcw,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function AdminReviewQueuePage() {
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load Submissions
  useEffect(() => {
    let isCancelled = false;

    async function fetchSubmissions() {
      if (!user?.uid || !isAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        const list = await getAdminSubmissions("all");
        if (!isCancelled) {
          setSubmissions(list);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading submissions:", err);
          setFetchError("Failed to retrieve moderation queue. Please check permissions.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchSubmissions();

    return () => {
      isCancelled = true;
    };
  }, [user, isAdmin, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Filter & Search computation
  const filteredSubmissions = useMemo(() => {
    let list = [...submissions];

    if (activeTab !== "all") {
      list = list.filter((s) => s.status.toLowerCase() === activeTab.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const title = (s.title || "").toLowerCase();
        const dev = (s.developerName || "").toLowerCase();
        const email = (s.developerEmail || "").toLowerCase();
        return title.includes(q) || dev.includes(q) || email.includes(q);
      });
    }

    return list;
  }, [submissions, activeTab, searchQuery]);

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
              Elevated administrator privileges are required to view the moderation queue.
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

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-(--body) hover:text-(--ink) transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Overview</span>
        </Link>

        <Button
          variant="outline"
          onClick={handleRetry}
          disabled={loading}
          className="h-8 px-2.5 border-(--line) text-(--body) hover:text-(--ink) bg-(--card) hover:bg-(--ink-soft) text-xs font-mono"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      {/* Page Header */}
      <div className="pb-6 border-b border-(--line) flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-semibold">
              Moderation Queue
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight">
            Submission Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-(--body) mt-0.5">
            Filter, search, and inspect developer submissions across all lifecycle states.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--body-dim)">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or developer..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-(--line) bg-(--card) text-xs font-mono outline-none focus:border-(--ink) shadow-xs"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {["all", "pending", "approved", "rejected", "draft"].map((tab) => {
          const count =
            tab === "all"
              ? submissions.length
              : submissions.filter((s) => s.status.toLowerCase() === tab).length;
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium capitalize transition-all border flex items-center gap-1.5 ${
                isActive
                  ? "bg-(--ink) text-(--paper) border-(--ink) shadow-[2px_2px_0_0_var(--coral)]"
                  : "bg-(--card) text-(--body) border-(--line) hover:border-(--ink)/40 hover:text-(--ink)"
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded ${
                  isActive ? "bg-white/20 text-white" : "bg-(--ink-soft) text-(--body)"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="space-y-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-(--card) border border-(--line) p-5 animate-pulse"
            />
          ))}
        </div>
      ) : fetchError ? (
        <div className="p-8 rounded-xl bg-(--card) border border-(--line) text-center space-y-4 shadow-[3px_3px_0_0_var(--line)]">
          <p className="text-sm text-rose-700">{fetchError}</p>
          <Button
            onClick={handleRetry}
            variant="outline"
            className="border-(--line) text-xs font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Retry
          </Button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="py-16 rounded-xl bg-(--card) border-2 border-dashed border-(--line) text-center p-8 space-y-3">
          <FolderOpen className="w-10 h-10 text-(--body-dim) mx-auto" />
          <h3 className="font-display text-lg font-medium text-(--ink)">
            No submissions found
          </h3>
          <p className="text-xs text-(--body) max-w-sm mx-auto">
            {searchQuery
              ? `No results matching "${searchQuery}" in ${activeTab} queue.`
              : `There are currently no items in the ${activeTab} queue.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredSubmissions.map((item) => (
            <div
              key={item.id}
              className="bg-(--card) rounded-xl border border-(--line) p-5 sm:p-6 shadow-[3px_3px_0_0_var(--line)] hover:border-(--ink)/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Icon */}
                {item.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.iconUrl}
                    alt={`${item.title} icon`}
                    className="w-12 h-12 rounded-xl border border-(--line) object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-(--ink) text-(--paper) font-display text-lg font-bold flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_var(--coral)]">
                    {item.title ? item.title.charAt(0).toUpperCase() : "P"}
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base sm:text-lg font-medium text-(--ink) truncate">
                      {item.title}
                    </h3>
                    <StatusBadge status={item.status} />
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-(--line) text-(--body) bg-(--paper) capitalize">
                      {item.primaryCategory}
                    </span>
                  </div>

                  <p className="text-xs text-(--body) line-clamp-1 max-w-xl">
                    {item.tagline || item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-(--body-dim) pt-0.5">
                    <span>
                      Dev: <strong className="text-(--ink)">{item.developerName || "Developer"}</strong>{" "}
                      ({item.developerEmail})
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{item.appUrl}</span>
                  </div>
                </div>
              </div>

              {/* Inspect Action */}
              <div className="shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-(--line)">
                <Link href={`/admin/review/${item.id}`}>
                  <Button className="h-9 px-4 bg-(--ink) hover:bg-[#1a3d40] text-(--paper) text-xs font-medium rounded-md shadow-none flex items-center gap-1.5 font-mono">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
