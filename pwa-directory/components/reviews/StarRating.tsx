"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number; // 0 to 5
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  const buttonPadding = {
    sm: "p-0.5",
    md: "p-1",
    lg: "p-1.5",
  };

  const activeRating = hoverValue !== null ? hoverValue : value;

  if (readOnly) {
    return (
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`Rating: ${value.toFixed(1)} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= Math.round(value);
          return (
            <Star
              key={star}
              className={`${sizeClasses[size]} ${
                isFilled
                  ? "fill-[#FF6A4D] text-[#FF6A4D]"
                  : "fill-transparent text-[#DBD5C3]"
              }`}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Rate this app from 1 to 5 stars"
      onMouseLeave={() => setHoverValue(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= activeRating;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHoverValue(star)}
            onFocus={() => setHoverValue(star)}
            onBlur={() => setHoverValue(null)}
            className={`${buttonPadding[size]} rounded-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-(--coral) transition-transform hover:scale-110 active:scale-95 cursor-pointer`}
          >
            <Star
              className={`${sizeClasses[size]} transition-colors duration-150 ${
                isFilled
                  ? "fill-[#FF6A4D] text-[#FF6A4D]"
                  : "fill-transparent text-[#DBD5C3] hover:text-[#FF6A4D]/60"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

