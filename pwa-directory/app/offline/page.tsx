"use client";

import React from "react";
import Link from "next/link";
import { WifiOff, RotateCcw, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink) flex flex-col justify-center items-center px-6 py-20"
      style={
        {
          "--paper": "#F6F4EC",
          "--card": "#FFFFFF",
          "--ink": "#122A2C",
          "--ink-soft": "#EEEAD9",
          "--body": "#4C5652",
          "--body-dim": "#7A8480",
          "--line": "#DBD5C3",
          "--coral": "#FF6A4D",
        } as React.CSSProperties
      }
    >
      <div className="w-full max-w-lg bg-(--card) rounded-2xl border border-(--line) p-8 sm:p-10 shadow-[6px_6px_0_0_var(--line)] text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
          <WifiOff className="w-8 h-8" />
        </div>

        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
            offline mode
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight mt-3 mb-2">
            You&apos;re currently offline
          </h1>
          <p className="text-sm text-(--body) leading-relaxed">
            Likha Apps is unable to connect to the network. Previously visited public pages remain viewable from local cache, but searching, submitting apps, and real-time updates require an active internet connection.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-(--paper) border border-(--line) text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-(--ink)">
            <Sparkles className="w-4 h-4 text-(--coral)" />
            <span>What you can still do:</span>
          </div>
          <ul className="text-xs text-(--body) space-y-1 pl-5 list-disc">
            <li>Browse previously visited apps and catalog pages cached on your device.</li>
            <li>Launch installed external progressive web apps.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleReload}
            className="flex-1 h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-xs flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Check Connection & Retry</span>
          </Button>

          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-11 border-(--line) text-(--ink) bg-white hover:bg-(--ink-soft) font-medium text-xs flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

