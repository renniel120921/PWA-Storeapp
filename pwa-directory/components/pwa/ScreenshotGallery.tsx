"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Smartphone,
  Globe,
  Sparkles,
} from "lucide-react";

interface ScreenshotGalleryProps {
  screenshots?: string[];
  appTitle: string;
  appIcon?: string;
  category?: string;
  tagline?: string;
}

export function ScreenshotGallery({
  screenshots = [],
  appTitle,
  appIcon,
  category,
  tagline,
}: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const hasScreenshots = Array.isArray(screenshots) && screenshots.length > 0;
  const count = hasScreenshots ? screenshots.length : 0;

  const goToPrev = useCallback(() => {
    if (!hasScreenshots) return;
    setSelectedIndex((prev) => (prev === 0 ? count - 1 : prev - 1));
  }, [hasScreenshots, count]);

  const goToNext = useCallback(() => {
    if (!hasScreenshots) return;
    setSelectedIndex((prev) => (prev === count - 1 ? 0 : prev + 1));
  }, [hasScreenshots, count]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isLightboxOpen, goToPrev, goToNext]);

  // If no screenshots provided, render graceful PWA preview fallback
  if (!hasScreenshots) {
    return (
      <section className="bg-(--card) rounded-xl border border-(--line) p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-(--coral)" />
            <h2 className="font-display text-xl sm:text-2xl font-medium text-(--ink) tracking-tight">
              App Preview
            </h2>
          </div>
          <span className="font-mono text-xs text-(--body-dim) uppercase">
            {category || "Web Standard"}
          </span>
        </div>

        <div className="rounded-xl border border-(--line) bg-(--paper) p-8 sm:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-(--card) border border-(--line) flex items-center justify-center shadow-xs mb-4 overflow-hidden">
            {appIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appIcon}
                alt={`${appTitle} icon`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Globe className="w-8 h-8 text-(--body-dim)" />
            )}
          </div>

          <h3 className="font-display text-lg font-medium text-(--ink) mb-1">
            {appTitle}
          </h3>
          <p className="text-xs sm:text-sm text-(--body) max-w-md mb-4">
            {tagline || "Experience this progressive web app seamlessly in any modern browser."}
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--card) border border-(--line) text-xs font-mono text-(--body-dim)">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Responsive PWA interface runs on Mobile & Desktop</span>
          </div>
        </div>
      </section>
    );
  }

  const currentScreenshot = screenshots[selectedIndex];

  return (
    <section className="bg-(--card) rounded-xl border border-(--line) p-6 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-medium text-(--ink) tracking-tight">
            Screenshots
          </h2>
          <p className="text-xs text-(--body) mt-0.5">
            Click any screenshot to view full resolution
          </p>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs text-(--body-dim) bg-(--paper) px-2.5 py-1 rounded-md border border-(--line)">
          <span>{selectedIndex + 1}</span>
          <span>/</span>
          <span>{count}</span>
        </div>
      </div>

      {/* Main Active Screenshot Showcase */}
      <div className="relative group rounded-xl overflow-hidden border border-(--line) bg-(--paper) flex items-center justify-center min-h-[260px] sm:min-h-[420px] max-h-[520px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentScreenshot}
          alt={`${appTitle} screenshot ${selectedIndex + 1}`}
          onClick={() => setIsLightboxOpen(true)}
          className="w-auto h-full max-h-[500px] max-w-full object-contain cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
        />

        {/* Hover / Overlay Zoom Button */}
        <button
          onClick={() => setIsLightboxOpen(true)}
          aria-label="View full size screenshot"
          className="absolute top-4 right-4 p-2.5 rounded-full bg-(--ink)/80 text-(--paper) hover:bg-(--ink) transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-md cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Previous Button (if multiple screenshots) */}
        {count > 1 && (
          <button
            onClick={goToPrev}
            aria-label="Previous screenshot"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-(--card)/90 border border-(--line) text-(--ink) hover:bg-(--card) shadow-md transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Next Button (if multiple screenshots) */}
        {count > 1 && (
          <button
            onClick={goToNext}
            aria-label="Next screenshot"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-(--card)/90 border border-(--line) text-(--ink) hover:bg-(--card) shadow-md transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Thumbnails Row (Desktop and Tablet) */}
      {count > 1 && (
        <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2 pt-1 scrollbar-none">
          {screenshots.map((shot, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              aria-label={`Select screenshot ${idx + 1}`}
              className={`relative shrink-0 w-20 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-(--paper) ${
                selectedIndex === idx
                  ? "border-(--coral) ring-2 ring-(--coral)/30"
                  : "border-(--line) opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shot}
                alt={`${appTitle} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot lightbox"
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
        >
          {/* Close Button */}
          <button
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close fullscreen preview"
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Controls in Lightbox */}
          {count > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                aria-label="Previous image"
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                aria-label="Next image"
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Full Resolution Image Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[85vh] flex flex-col items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentScreenshot}
              alt={`${appTitle} screenshot full size ${selectedIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 flex items-center gap-3 text-white/80 font-mono text-xs">
              <span>{appTitle}</span>
              <span>•</span>
              <span>
                {selectedIndex + 1} of {count}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
