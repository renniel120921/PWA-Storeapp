"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PwaVerificationResult } from "@/lib/services/pwa-verifier.service";

interface PwaAuditReportProps {
  report: PwaVerificationResult;
  onProceed: () => void;
  onReverify: () => void;
}

export function PwaAuditReport({
  report,
  onProceed,
  onReverify,
}: PwaAuditReportProps) {
  const { checks, manifest, warnings } = report;

  const items = [
    {
      title: "HTTPS Security",
      status: checks.https ? "passed" : "failed",
      label: checks.https ? "Passed (SSL Secured)" : "Failed (Insecure)",
      detail: "Application is served over encrypted HTTPS connection.",
    },
    {
      title: "Website Reachability",
      status: checks.reachable ? "passed" : "failed",
      label: checks.reachable ? "Passed (HTTP 200 OK)" : "Failed (Unreachable)",
      detail: "Host responded successfully within the connection timeout window.",
    },
    {
      title: "Web App Manifest",
      status: checks.manifestFound && checks.manifestValid ? "passed" : checks.manifestFound ? "warning" : "failed",
      label: checks.manifestFound && checks.manifestValid ? "Passed (Valid JSON)" : checks.manifestFound ? "Warning (Invalid JSON)" : "Missing",
      detail: checks.manifestFound ? "Web app manifest discovered and parsed." : "No <link rel=\"manifest\"> or /manifest.json found.",
    },
    {
      title: "App Identity",
      status: manifest?.name || manifest?.shortName ? "passed" : "warning",
      label: manifest?.name || manifest?.shortName ? "Detected" : "Missing Name",
      detail: manifest?.name ? `Found name: "${manifest.name}"` : "No name found in manifest.",
    },
    {
      title: "App Icons (192x192 & 512x512)",
      status: checks.has192Icon && checks.has512Icon ? "passed" : checks.has192Icon || checks.has512Icon ? "warning" : "warning",
      label: checks.has192Icon && checks.has512Icon ? "Passed (Both Found)" : checks.has192Icon || checks.has512Icon ? "Partial (One Icon Missing)" : "No Icons Found",
      detail: "Icons are used for home screen shortcuts and browser splash screens.",
    },
    {
      title: "Maskable Icon Purpose",
      status: checks.hasMaskableIcon ? "passed" : "info",
      label: checks.hasMaskableIcon ? "Detected" : "Not Specified (Optional)",
      detail: "Ensures adaptive adaptive circular/squircle icon rendering on Android.",
    },
    {
      title: "Service Worker Registration",
      status: checks.serviceWorkerDetected ? "passed" : "info",
      label: checks.serviceWorkerDetected ? "Detected in Markup" : "Unable to verify in HTML",
      detail: "Service workers provide offline caching and background sync capabilities.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Overview */}
      <div className="p-6 rounded-xl bg-(--card) border border-(--line) shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-5 h-5 text-(--gold)" />
            <h3 className="font-display text-xl font-medium text-(--ink)">
              Automated PWA Audit Summary
            </h3>
          </div>
          <p className="text-xs font-mono text-(--body-dim) truncate max-w-md">
            Target: {report.finalUrl || report.url}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {report.ok ? (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Audit Passed
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Action Recommended
            </span>
          )}
        </div>
      </div>

      {/* Audit Checklist Items */}
      <div className="divide-y divide-(--line) border border-(--line) rounded-xl bg-(--card) overflow-hidden shadow-xs">
        {items.map((item) => (
          <div
            key={item.title}
            className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 sm:mt-0 shrink-0">
                {item.status === "passed" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                {item.status === "warning" && (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                {item.status === "failed" && (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                {item.status === "info" && (
                  <HelpCircle className="w-5 h-5 text-(--body-dim)" />
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-(--ink) leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-(--body) leading-relaxed mt-0.5">
                  {item.detail}
                </p>
              </div>
            </div>

            <span
              className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-md shrink-0 border whitespace-nowrap ${
                item.status === "passed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : item.status === "warning"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : item.status === "failed"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-(--ink-soft) text-(--body) border-(--line)"
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Warnings Callout if any */}
      {warnings.length > 0 && (
        <div className="p-5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs space-y-2">
          <div className="font-semibold flex items-center gap-1.5 font-mono uppercase text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Audit Notes & Recommendations</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onReverify}
          className="h-11 px-5 border-(--line) text-(--body) hover:text-(--ink) bg-transparent hover:bg-(--ink-soft) text-xs font-mono"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-2" />
          Change URL
        </Button>

        <Button
          type="button"
          onClick={onProceed}
          className="h-11 px-6 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm rounded-md shadow-none flex items-center gap-2"
        >
          <span>Continue to App Details</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

