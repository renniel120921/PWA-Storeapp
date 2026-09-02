"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";

export type SortOption = "recommended" | "top_rated" | "newest" | "name_asc";

interface SortDropdownProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "top_rated", label: "Top Rated" },
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "A–Z" },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="relative inline-flex items-center shrink-0">
      <label htmlFor="directory-sort" className="sr-only">
        Sort directory apps
      </label>
      <div className="absolute left-3 pointer-events-none text-(--body-dim) flex items-center gap-1.5">
        <ArrowUpDown className="w-3.5 h-3.5" />
      </div>
      <select
        id="directory-sort"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        aria-label="Sort apps by"
        className="h-11 pl-9 pr-8 rounded-md border border-(--line) bg-(--card) text-(--ink) text-xs font-mono font-medium outline-none transition-colors appearance-none cursor-pointer focus:border-(--ink) focus:ring-1 focus:ring-(--ink)"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 pointer-events-none text-(--body-dim) text-[10px]">
        ▼
      </div>
    </div>
  );
}
