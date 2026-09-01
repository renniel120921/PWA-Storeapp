"use client";

import React, { useState } from "react";
import { Globe, ArrowRight, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ManifestUrlInputProps {
  initialUrl: string;
  onVerify: (url: string) => Promise<void>;
  isVerifying: boolean;
  error?: string | null;
}

export function ManifestUrlInput({
  initialUrl,
  onVerify,
  isVerifying,
  error,
}: ManifestUrlInputProps) {
  const [url, setUrl] = useState(initialUrl);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setLocalError("Please enter your web application URL.");
      return;
    }

    if (!trimmed.startsWith("https://")) {
      setLocalError("App URL must start with https:// (secure SSL connection required).");
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setLocalError("Please enter a valid URL (e.g. https://myapp.com).");
      return;
    }

    await onVerify(trimmed);
  };

  const activeError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="pwa-app-url"
          className="block font-mono text-xs uppercase tracking-wider text-(--body)"
        >
          Progressive Web App URL <span className="text-(--coral)">*</span>
        </label>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-(--body-dim)">
            <Globe className="w-4 h-4" />
          </div>
          <input
            id="pwa-app-url"
            type="url"
            disabled={isVerifying}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (localError) setLocalError(null);
            }}
            placeholder="https://your-pwa-domain.com"
            className="w-full h-12 pl-10 pr-4 rounded-md border border-(--line) bg-(--card) text-(--ink) placeholder:text-(--body-dim) text-sm outline-none transition-all focus:border-(--ink) focus:ring-1 focus:ring-(--ink) disabled:opacity-60"
          />
        </div>

        <p className="text-xs text-(--body-dim) leading-relaxed">
          Enter the production URL where your progressive web app is hosted. Our server will inspect your web app manifest, icons, and SSL certificate.
        </p>
      </div>

      {activeError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{activeError}</div>
        </div>
      )}

      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-(--body-dim)">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>SSRF-protected verification engine</span>
        </div>

        <Button
          type="submit"
          disabled={isVerifying || !url.trim()}
          className="h-11 px-6 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm rounded-md shadow-none flex items-center gap-2 disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Inspecting PWA...</span>
            </>
          ) : (
            <>
              <span>Verify App</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

