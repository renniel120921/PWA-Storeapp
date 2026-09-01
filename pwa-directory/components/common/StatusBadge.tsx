"use client";

import React from "react";
import {
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import type { PwaStatus } from "@/types";

interface StatusBadgeProps {
  status: PwaStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  switch (status) {
    case "draft":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-(--ink-soft) text-(--body) border border-(--line) ${className}`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>Draft</span>
        </span>
      );

    case "pending":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-300 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Pending Review</span>
        </span>
      );

    case "approved":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-300 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Approved & Live</span>
        </span>
      );

    case "rejected":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-50 text-rose-800 border border-rose-300 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Needs Attention</span>
        </span>
      );

    case "suspended":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-red-100 text-red-900 border border-red-300 ${className}`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
          <span>Suspended</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-gray-100 text-gray-800 border border-gray-200 ${className}`}
        >
          <span>{status}</span>
        </span>
      );
  }
}

