"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import type { Pwa } from "@/types";

interface PwaCardProps {
  app: Pwa;
}

export function PwaCard({ app }: PwaCardProps) {
  const router = useRouter();
  const slug = app.slug || app.id;
  const targetUrl = app.appUrl || app.app_url || "";
  const displayCategory =
    app.primaryCategory || (app.categories && app.categories[0]) || "tools";

  const handleCardClick = () => {
    if (slug) {
      router.push(`/apps/${slug}`);
    }
  };

  const handleDirectLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="catalog-card group rounded-lg border border-(--line) bg-(--card) text-(--ink) p-7 flex flex-col h-full cursor-pointer transition-[transform,box-shadow] duration-200"
    >
      <div className="flex justify-between items-start mb-5 gap-4">
        <h3 className="font-display text-xl font-medium line-clamp-1 group-hover:text-(--coral) transition-colors">
          {app.title}
        </h3>
        <span className="font-mono text-xs px-2.5 py-1 rounded border border-(--ink)/15 text-(--body) shrink-0 capitalize bg-(--paper)/50">
          {displayCategory}
        </span>
      </div>

      <p className="text-(--body) line-clamp-3 text-sm leading-relaxed mb-8 flex-1">
        {app.tagline || app.description || "No description provided for this application."}
      </p>

      <div className="flex items-center justify-between font-mono text-xs text-(--body-dim) border-t border-(--line) pt-5 group-hover:text-(--ink) transition-colors">
        <span className="truncate max-w-[70%]">
          {targetUrl.replace(/^https?:\/\//, "")}
        </span>
        <button
          type="button"
          onClick={handleDirectLaunch}
          title="Open app directly in a new tab"
          className="p-1 rounded hover:bg-(--ink-soft) hover:text-(--coral) transition-colors"
        >
          <ExternalLink className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
