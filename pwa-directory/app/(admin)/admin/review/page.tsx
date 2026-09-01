"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminSubmissions,
  type AdminSubmissionItem,
} from "@/lib/services/admin.service";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Search,
  RotateCcw,
  Layers,
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
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-(--body) hover:text-(--ink) transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to admin overview</span>
          </Link>

          <span className="font-mono text-xs text-(--body-dim)">
            Admin: {user?.email}
          </span>
        </div>

        {/* Page Header */}
        <div className="pb-6 border-b border-(--line) flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-5 h-5 text-(--gold)" />
              <h1 className="font-display text-3xl font-medium text-(--ink) tracking-tight">
                Moderation Review Queue
              </h1>
            </div>
            <p className="text-sm text-(--body)">
              Filter, search, and inspect developer submissions across all lifecycle states.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--body-dim)">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or developer..."
              className="w-full h-10 pl-9 pr-4 rounded-md border border-(--line) bg-(--card) text-xs outline-none focus:border-(--ink)"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {["all", "pending", "approved", "rejected", "suspended", "draft"].map((tab) => {
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium capitalize transition-colors border flex items-center gap-1.5 ${
                  isActive
                    ? "bg-(--ink) text-(--paper) border-(--ink)"
                    : "bg-(--card) text-(--body) border-(--line) hover:border-(--ink)/40 hover:text-(--ink)"
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-(--ink-soft) text-(--body)"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-(--card) border border-(--line) p-6 animate-pulse"
              />
            ))}
          </div>
        ) : fetchError ? (
          <div className="p-8 rounded-xl bg-(--card) border border-(--line) text-center space-y-4">
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
          <div className="py-20 rounded-xl bg-(--card) border-2 border-dashed border-(--line) text-center p-8 space-y-3">
            <Layers className="w-10 h-10 text-(--body-dim) mx-auto" />
            <h3 className="font-display text-xl font-medium text-(--ink)">
              No submissions found
            </h3>
            <p className="text-xs text-(--body) max-w-sm mx-auto">
              {searchQuery
                ? `No results matching "${searchQuery}" in ${activeTab} queue.`
                : `There are currently no items in the ${activeTab} queue.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((item) => (
              <div
                key={item.id}
                className="bg-(--card) rounded-xl border border-(--line) p-5 sm:p-6 shadow-xs hover:border-(--ink)/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon */}
                  {item.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.iconUrl}
                      alt={`${item.title} icon`}
                      className="w-12 h-12 rounded-xl border border-(--line) object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-(--ink) text-(--paper) font-display text-lg font-bold flex items-center justify-center shrink-0">
                      {item.title ? item.title.charAt(0).toUpperCase() : "P"}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-base sm:text-lg font-medium text-(--ink)">
                        {item.title}
                      </h3>
                      <StatusBadge status={item.status} />
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-(--ink)/15 text-(--body) bg-(--paper) capitalize">
                        {item.primaryCategory}
                      </span>
                    </div>

                    <p className="text-xs text-(--body) line-clamp-1 max-w-xl">
                      {item.tagline || item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-(--body-dim) pt-1">
                      <span>Dev: <strong className="text-(--ink)">{item.developerName}</strong> ({item.developerEmail})</span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{item.appUrl}</span>
                    </div>
                  </div>
                </div>

                {/* Inspect Action */}
                <div className="shrink-0 self-end md:self-center">
                  <Link href={`/admin/review/${item.id}`}>
                    <Button className="h-9 px-4 bg-(--ink) hover:bg-(--ink)/90 text-(--paper) text-xs font-medium rounded-md shadow-none flex items-center gap-1.5 font-mono">
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
    </div>
  );
}
