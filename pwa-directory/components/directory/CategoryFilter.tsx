"use client";

import React from "react";
import { DIRECTORY_CATEGORIES } from "@/lib/constants/categories";

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter apps by category"
      className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth"
    >
      {DIRECTORY_CATEGORIES.map((cat) => {
        const isSelected = selectedCategory.toLowerCase() === cat.slug.toLowerCase();
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onSelectCategory(cat.slug)}
            aria-pressed={isSelected}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-150 shrink-0 border ${
              isSelected
                ? "bg-(--ink) text-(--paper) border-(--ink) shadow-xs"
                : "bg-(--card) text-(--body) border-(--line) hover:border-(--ink)/40 hover:text-(--ink)"
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

