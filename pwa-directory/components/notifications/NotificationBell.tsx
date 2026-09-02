"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import type { AppNotification } from "@/types";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface NotificationBellProps {
  className?: string;
  align?: "left" | "right";
}

function formatTimeAgo(timestamp: AppNotification["createdAt"]): string {
  if (!timestamp) return "Recently";

  let timeMs = 0;
  if (typeof timestamp === "object" && "seconds" in timestamp) {
    timeMs = timestamp.seconds * 1000;
  } else if (timestamp instanceof Date) {
    timeMs = timestamp.getTime();
  }

  if (!timeMs) return "Recently";

  const diffSec = Math.floor((Date.now() - timeMs) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timeMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function NotificationBell({
  className = "",
  align = "right",
}: NotificationBellProps) {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Handle notification click: mark as read and navigate
  const handleItemClick = async (item: AppNotification) => {
    if (!item.read) {
      await markAsRead(item.id);
    }
    setOpen(false);

    if (item.link) {
      router.push(item.link);
    }
  };

  const getNotificationIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "new_submission":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case "submission_approved":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "submission_rejected":
        return (
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-(--ink)/5 text-(--ink) flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
        className="relative p-2 rounded-lg text-(--body) hover:text-(--ink) hover:bg-(--ink-soft) border border-transparent hover:border-(--line) transition-all cursor-pointer"
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-(--coral) text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-(--card) animate-in zoom-in duration-150">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className={`absolute ${
            align === "left" ? "left-0" : "right-0"
          } top-full mt-2 w-80 sm:w-96 bg-(--card) border border-(--line) rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 text-(--ink)`}
        >
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-(--line) bg-(--paper)/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm text-(--ink)">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="font-mono text-[10px] uppercase font-bold bg-(--coral)/15 text-(--coral) px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-mono text-(--body-dim) hover:text-(--ink) flex items-center gap-1 cursor-pointer transition-colors"
                title="Mark all notifications as read"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-(--line)/60">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg bg-(--ink)/5 animate-pulse"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-(--ink)/5 text-(--body-dim) flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-xs font-mono text-(--body-dim)">
                  No notifications yet.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 px-4 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                      isUnread
                        ? "bg-(--coral)/5 hover:bg-(--coral)/10"
                        : "bg-(--card) hover:bg-(--ink-soft)/60"
                    }`}
                  >
                    {/* Icon */}
                    {getNotificationIcon(item.type)}

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span
                          className={`text-xs truncate ${
                            isUnread
                              ? "font-semibold text-(--ink)"
                              : "font-medium text-(--body)"
                          }`}
                        >
                          {item.title}
                        </span>

                        <span className="text-[10px] font-mono text-(--body-dim) shrink-0">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p
                        className={`text-xs leading-relaxed line-clamp-2 ${
                          isUnread ? "text-(--ink)" : "text-(--body-dim)"
                        }`}
                      >
                        {item.message}
                      </p>

                      {item.link && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-(--coral)">
                          <span>View details</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Unread Dot */}
                    {isUnread && (
                      <div
                        className="w-2 h-2 rounded-full bg-(--coral) shrink-0 mt-1.5"
                        title="Unread"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

