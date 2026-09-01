"use client";

import React from "react";
import { ExternalLink, ShieldCheck, Tag, Globe, DollarSign } from "lucide-react";

interface PwaPreviewCardProps {
  data: {
    title: string;
    tagline: string;
    description: string;
    appUrl: string;
    iconUrl: string;
    primaryCategory: string;
    categories: string[];
    tags: string[];
    pricing: string;
    screenshots: string[];
  };
}

export function PwaPreviewCard({ data }: PwaPreviewCardProps) {
  const displayCategory = data.primaryCategory || "tools";
  const domain = data.appUrl ? data.appUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "your-app.com";

  return (
    <div className="space-y-8">
      {/* 1. Catalog Card Preview */}
      <div>
        <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-3">
          1. Public Directory Card Preview
        </span>

        <div className="max-w-md catalog-card rounded-lg border border-(--line) bg-(--card) text-(--ink) p-7 flex flex-col shadow-[5px_5px_0_0_var(--line)]">
          <div className="flex justify-between items-start mb-5 gap-4">
            <div className="flex items-center gap-3">
              {data.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.iconUrl}
                  alt={`${data.title} icon`}
                  className="w-10 h-10 rounded-lg object-cover border border-(--line)"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-(--ink) text-(--paper) font-display font-semibold flex items-center justify-center text-base">
                  {data.title ? data.title.charAt(0).toUpperCase() : "P"}
                </div>
              )}
              <h3 className="font-display text-xl font-medium line-clamp-1">
                {data.title || "Untitled Application"}
              </h3>
            </div>

            <span className="font-mono text-xs px-2.5 py-1 rounded border border-(--ink)/15 text-(--body) shrink-0 capitalize bg-(--paper)/50">
              {displayCategory}
            </span>
          </div>

          <p className="text-(--body) line-clamp-3 text-sm leading-relaxed mb-8 flex-1">
            {data.tagline || data.description || "No description provided yet."}
          </p>

          <div className="flex items-center justify-between font-mono text-xs text-(--body-dim) border-t border-(--line) pt-5">
            <span className="truncate max-w-[80%]">{domain}</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </div>
        </div>
      </div>

      {/* 2. Detail Showcase Preview */}
      <div>
        <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-3">
          2. Detail Page Showcase Preview
        </span>

        <div className="rounded-xl border border-(--line) bg-(--card) p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-6 border-b border-(--line)">
            <div className="flex items-start gap-4">
              {data.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.iconUrl}
                  alt={`${data.title} icon`}
                  className="w-16 h-16 rounded-xl object-cover border border-(--line) shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-(--ink) text-(--paper) font-display font-semibold flex items-center justify-center text-2xl shrink-0">
                  {data.title ? data.title.charAt(0).toUpperCase() : "P"}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs uppercase px-2 py-0.5 rounded border border-(--ink)/15 text-(--body) bg-(--paper)">
                    {displayCategory}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    Verified PWA
                  </span>
                </div>
                <h2 className="font-display text-2xl font-medium text-(--ink)">
                  {data.title || "Untitled Application"}
                </h2>
                <p className="text-sm text-(--body) mt-1">
                  {data.tagline || "No short tagline provided."}
                </p>
              </div>
            </div>

            <span className="font-mono text-xs px-3 py-1 rounded bg-(--ink-soft) text-(--ink) capitalize font-medium shrink-0">
              {data.pricing || "Free"}
            </span>
          </div>

          <div>
            <h4 className="font-display text-base font-medium text-(--ink) mb-2">
              Full Description
            </h4>
            <p className="text-xs text-(--body) leading-relaxed whitespace-pre-line">
              {data.description || "No full description provided."}
            </p>
          </div>

          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[11px] text-(--body-dim) bg-(--ink-soft) px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Screenshots Preview */}
          {data.screenshots && data.screenshots.length > 0 && (
            <div className="pt-4 border-t border-(--line)">
              <h4 className="font-display text-sm font-medium text-(--ink) mb-3">
                Screenshots ({data.screenshots.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.screenshots.map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={url}
                    alt={`Screenshot ${idx + 1}`}
                    className="rounded-lg border border-(--line) w-full h-24 object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Metadata Verification Summary */}
      <div className="p-5 rounded-xl bg-(--paper) border border-(--line) text-xs space-y-3">
        <h4 className="font-mono uppercase font-semibold text-(--ink) text-[11px]">
          Listing Verification Checklist
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-(--body)">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-(--body-dim)" />
            <span className="truncate">{data.appUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-(--body-dim)" />
            <span>Category: <strong className="text-(--ink) capitalize">{displayCategory}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-(--body-dim)" />
            <span>Pricing: <strong className="text-(--ink) capitalize">{data.pricing}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Audit status: <strong>Passed</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

