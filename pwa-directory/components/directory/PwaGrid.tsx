"use client";

import React from "react";
import { LayoutGrid, SearchX } from "lucide-react";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[230px] rounded-lg bg-(--card) border border-(--line) p-7 flex flex-col justify-between animate-pulse"
          >
            <div className="flex justify-between items-start">
              <div className="h-6 w-32 bg-(--ink)/10 rounded" />
              <div className="h-5 w-16 bg-(--ink)/10 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-(--ink)/5 rounded" />
              <div className="h-4 w-3/4 bg-(--ink)/5 rounded" />
            </div>
            <div className="h-4 w-1/2 bg-(--ink)/10 rounded pt-4 border-t border-(--line)" />
          </div>
        ))}
      </div>
    );
  }

  // 2. Filter / Search Empty State
  const hasActiveFilters = searchQuery.trim() !== "" || selectedCategory !== "all";

  if (apps.length === 0 && hasActiveFilters) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-(--line) rounded-lg bg-(--card) px-6">
        <SearchX className="mx-auto h-10 w-10 text-(--body-dim) mb-4" />
        <h3 className="text-xl font-semibold text-(--ink) font-display mb-2">
          No matching apps found
        </h3>
        <p className="text-sm text-(--body) max-w-md mx-auto mb-6 leading-relaxed">
          We couldn&apos;t find any progressive web apps matching your current search or category filter.
        </p>
        <Button
          onClick={onClearFilters}
          variant="outline"
          className="border-(--ink)/25 text-(--ink) bg-transparent hover:bg-(--ink-soft) h-10 px-5 text-sm font-medium"
        >
          Reset filters
        </Button>
      </div>
    );
  }

  // 3. Absolute Empty Directory
  if (apps.length === 0) {
    return (
      <div className="py-24 text-center border-2 border-dashed border-(--line) rounded-lg bg-(--card) px-6">
        <LayoutGrid className="mx-auto h-10 w-10 text-(--body-dim) mb-5" />
        <h3 className="text-xl font-semibold text-(--ink) font-display mb-2">
          The shelf is empty
        </h3>
        <p className="text-base text-(--body) mb-8">
          Be the first entry in the catalog.
        </p>
        <Button
          onClick={onOpenSubmit}
          variant="outline"
          className="border-(--ink)/25 text-(--ink) bg-transparent hover:bg-(--ink-soft) h-12 px-6"
        >
          Submit now
        </Button>
      </div>
    );
  }

  // 4. Grid of Cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {apps.map((app) => (
        <PwaCard key={app.id || app.slug} app={app} />
      ))}
    </div>
  );
}

