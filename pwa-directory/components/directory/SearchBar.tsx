"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search apps by title, keyword, or description...",
}: SearchBarProps) {
  return (
    <div className="relative w-full">
      <label htmlFor="directory-search" className="sr-only">
        Search directory
      </label>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--body-dim)">
        <Search className="w-4 h-4" />
      </div>
      <input
        id="directory-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search directory apps"
        className="w-full h-11 pl-10 pr-10 rounded-md border border-(--line) bg-(--card) text-(--ink) placeholder:text-(--body-dim) text-sm outline-none transition-all duration-200 focus:border-(--ink) focus:ring-1 focus:ring-(--ink)"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search query"
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-(--body-dim) hover:text-(--ink) transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

