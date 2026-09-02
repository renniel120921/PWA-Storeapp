"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isAppFavorited, toggleFavorite } from "@/lib/services/favorite.service";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";

interface FavoriteButtonProps {
  pwaSlug: string;
  appTitle: string;
  className?: string;
  variant?: "hero" | "compact";
}

export function FavoriteButton({
  pwaSlug,
  appTitle,
  className = "",
  variant = "hero",
}: FavoriteButtonProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialChecked, setInitialChecked] = useState(false);

  // Check initial favorite state when user is authenticated
  useEffect(() => {
    let isCancelled = false;

    async function checkStatus() {
      if (!user?.uid || !pwaSlug) {
        setIsFavorited(false);
        setInitialChecked(true);
        return;
      }

      try {
        const favorited = await isAppFavorited(user.uid, pwaSlug);
        if (!isCancelled) {
          setIsFavorited(favorited);
          setInitialChecked(true);
        }
      } catch (err) {
        console.error("Error checking favorite status:", err);
        if (!isCancelled) {
          setInitialChecked(true);
        }
      }
    }

    if (!authLoading) {
      checkStatus();
    }

    return () => {
      isCancelled = true;
    };
  }, [user, pwaSlug, authLoading]);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isAuthenticated || !user?.uid) {
        // Direct guests to login with ?next= return path
        const nextUrl = encodeURIComponent(`/apps/${pwaSlug}`);
        router.push(`/login?next=${nextUrl}`);
        return;
      }

      setLoading(true);
      const previousState = isFavorited;
      // Optimistic update
      setIsFavorited(!previousState);

      try {
        const res = await toggleFavorite(user.uid, pwaSlug);
        setIsFavorited(res.favorited);

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: res.favorited ? "success" : "info",
          title: res.favorited
            ? `Saved ${appTitle} to favorites`
            : `Removed ${appTitle} from favorites`,
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: false,
          background: "#FFFFFF",
          color: "#122A2C",
          customClass: {
            popup: "rounded-xl border border-[#DBD5C3] shadow-md text-xs",
          },
        });
      } catch (err) {
        // Revert on failure
        console.error("Error toggling favorite:", err);
        setIsFavorited(previousState);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "error",
          title: "Could not update favorites",
          showConfirmButton: false,
          timer: 2000,
          background: "#FFFFFF",
          color: "#122A2C",
        });
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, user, pwaSlug, appTitle, isFavorited, router]
  );

  if (variant === "compact") {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-label={isFavorited ? "Remove from favorites" : "Save to favorites"}
        title={isFavorited ? "Saved in your favorites" : "Save to favorites"}
        className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
          isFavorited
            ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            : "border-(--line) bg-(--card) text-(--body) hover:text-(--ink) hover:bg-(--paper)"
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-(--body-dim)" />
        ) : isFavorited ? (
          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
        ) : (
          <Heart className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading || (authLoading && !initialChecked)}
      variant="outline"
      aria-label={isFavorited ? "Remove from favorites" : "Save to favorites"}
      className={`h-12 px-6 rounded-md font-medium text-sm transition-all cursor-pointer flex items-center gap-2 border-(--line) ${
        isFavorited
          ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
          : "bg-(--card) text-(--ink) hover:bg-(--paper)"
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-(--body-dim)" />
      ) : isFavorited ? (
        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
      ) : (
        <Heart className="w-4 h-4 text-(--body)" />
      )}
      <span>{isFavorited ? "Saved" : "Save"}</span>
    </Button>
  );
}
