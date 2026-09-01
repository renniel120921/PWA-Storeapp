"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, ArrowRight, ShieldCheck } from "lucide-react";
import type { Pwa } from "@/types";

interface PwaCardProps {
  app: Pwa;
}

export function PwaCard({ app }: PwaCardProps) {
  const slug = app.slug || app.id;
  const targetUrl = app.appUrl || app.app_url || "";
  const displayCategory =
    app.primaryCategory || (app.categories && app.categories[0]) || "tools";

  const handleDirectLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="catalog-card group rounded-2xl border border-(--line) bg-(--card) text-(--ink) p-5 sm:p-6 flex flex-col h-full transition-all duration-200 hover:-translate-y-1 hover:border-(--ink) hover:shadow-[6px_6px_0_0_var(--ink)]">
      {/* Top Header: App Icon + Name + Category */}
      <div className="flex items-start gap-4 mb-3.5">
        {/* App Icon */}
        <Link href={`/apps/${slug}`} className="shrink-0 focus:outline-hidden">
          {app.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.iconUrl}
              alt={`${app.title} icon`}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-(--line) object-cover shadow-xs group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-(--ink) text-(--paper) font-display text-2xl font-bold flex items-center justify-center shadow-[2px_2px_0_0_var(--coral)] group-hover:scale-105 transition-transform duration-200">
              {app.title ? app.title.charAt(0).toUpperCase() : "P"}
            </div>
          )}
        </Link>

        {/* Title, Developer & Category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Link
              href={`/apps/${slug}`}
              className="focus:outline-hidden group-hover:text-(--coral) transition-colors truncate"
            >
              <h3 className="font-display text-lg sm:text-xl font-medium tracking-tight text-(--ink) truncate">
                {app.title}
              </h3>
            </Link>
          </div>

          <p className="text-xs font-mono text-(--body-dim) truncate mb-1.5">
            {app.developerName || targetUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-(--line) bg-(--paper) text-(--body) capitalize">
              {displayCategory}
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>PWA</span>
            </span>
          </div>
        </div>
      </div>

      {/* Description / Tagline */}
      <Link href={`/apps/${slug}`} className="flex-1 focus:outline-hidden">
        <p className="text-(--body) line-clamp-2 text-xs sm:text-sm leading-relaxed mb-4">
          {app.tagline || app.description || "No description provided for this application."}
        </p>
      </Link>

      {/* Marketplace Action Footer */}
      <div className="flex items-center justify-between border-t border-(--line) pt-3.5 mt-auto gap-3">
        {/* Pricing / Meta */}
        <span className="font-mono text-xs font-medium text-(--body-dim) capitalize">
          {app.pricing === "freemium" ? "Freemium" : app.pricing === "paid" ? "Paid" : "Free"}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {targetUrl && (
            <button
              type="button"
              onClick={handleDirectLaunch}
              title="Launch app directly in a new tab"
              className="p-1.5 rounded-md border border-(--line) text-(--body-dim) hover:text-(--ink) hover:bg-(--ink-soft) transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <Link href={`/apps/${slug}`}>
            <button
              type="button"
              className="h-8 px-3 rounded-md bg-(--ink) text-(--paper) hover:bg-[#1a3d40] text-xs font-mono font-medium flex items-center gap-1.5 shadow-none transition-colors cursor-pointer"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
