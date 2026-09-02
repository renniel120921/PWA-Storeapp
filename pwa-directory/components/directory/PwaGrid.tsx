"use client";

import React from "react";
import { LayoutGrid, SearchX, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PwaCard } from "./PwaCard";
import type { Pwa } from "@/types";

interface PwaGridProps {
  apps: Pwa[];
  loading: boolean;
  searchQuery: string;
  selectedCategory: string;
  onClearFilters: () => void;
  onOpenSubmit: () => void;
}

export function PwaGrid({
  apps,
  loading,
  searchQuery,
  selectedCategory,
  onClearFilters,
  onOpenSubmit,
}: PwaGridProps) {
  // 1. Loading Skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[210px] rounded-2xl bg-(--card) border border-(--line) p-6 flex flex-col justify-between animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-(--ink)/10 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-3/4 bg-(--ink)/10 rounded" />
                <div className="h-3 w-1/2 bg-(--ink)/5 rounded" />
                <div className="h-3 w-1/4 bg-(--ink)/5 rounded" />
              </div>
            </div>
            <div className="space-y-1.5 my-3">
              <div className="h-3 w-full bg-(--ink)/5 rounded" />
              <div className="h-3 w-2/3 bg-(--ink)/5 rounded" />
            </div>
            <div className="h-8 w-full bg-(--ink)/5 rounded pt-3 border-t border-(--line)" />
          </div>
        ))}
      </div>
    );
  }

  // 2. Filter / Search Empty State
  const hasActiveFilters = searchQuery.trim() !== "" || selectedCategory !== "all";

  if (apps.length === 0 && hasActiveFilters) {
    return (
      <div className="py-16 text-center border-2 border-dashed border-(--line) rounded-2xl bg-(--card) px-6 max-w-xl mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-full bg-(--ink)/5 flex items-center justify-center mx-auto mb-4 text-(--body-dim)">
          <SearchX className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-semibold text-(--ink) font-display mb-1.5">
          No apps found
        </h3>
        <p className="text-xs sm:text-sm text-(--body) max-w-sm mx-auto mb-6 leading-relaxed">
          Try a different search or category.
        </p>
        <Button
          onClick={onClearFilters}
          variant="outline"
          className="border-(--line) text-(--ink) bg-transparent hover:bg-(--ink-soft) h-10 px-5 text-xs font-mono font-medium inline-flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset all filters</span>
        </Button>
      </div>
    );
  }

  // 3. Absolute Empty Directory
  if (apps.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-(--line) rounded-2xl bg-(--card) px-6 max-w-xl mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-full bg-(--ink)/5 flex items-center justify-center mx-auto mb-4 text-(--body-dim)">
          <LayoutGrid className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-semibold text-(--ink) font-display mb-1.5">
          No apps published yet
        </h3>
        <p className="text-xs sm:text-sm text-(--body) mb-6 max-w-sm mx-auto leading-relaxed">
          Great progressive web apps will appear here as developers publish them to the community directory.
        </p>
        <Button
          onClick={onOpenSubmit}
          className="bg-(--coral) hover:bg-[#e85a3e] text-white h-11 px-6 text-xs font-medium rounded-md shadow-none inline-flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Your App</span>
        </Button>
      </div>
    );
  }

  // 4. Grid of Cards
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
      {apps.map((app) => (
        <PwaCard key={app.id || app.slug} app={app} />
      ))}
    </div>
  );
}
