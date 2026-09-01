"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { StarRating } from "./StarRating";
import {
  submitPwaRating,
  getPwaReviews,
  getUserPwaReview,
  type ReviewItem,
} from "@/lib/services/review.service";
import {
  showSuccessAlert,
  showErrorAlert,
  showLoadingAlert,
} from "@/lib/utils/swal";
import { Button } from "@/components/ui/button";
import { MessageSquare, Star, User, Lock, Send, Sparkles } from "lucide-react";

interface RatingSectionProps {
  pwaSlug: string;
  appTitle: string;
  initialAverage: number;
  initialCount: number;
}

export function RatingSection({
  pwaSlug,
  appTitle,
  initialAverage,
  initialCount,
}: RatingSectionProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const hasMounted = useHydrated();

  const [ratingAverage, setRatingAverage] = useState(initialAverage);
  const [ratingCount, setRatingCount] = useState(initialCount);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Form State
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [isExistingReview, setIsExistingReview] = useState(false);

  // Fetch reviews
  const refreshReviews = useCallback(async () => {
    try {
      const data = await getPwaReviews(pwaSlug);
      setReviews(data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  }, [pwaSlug]);

  useEffect(() => {
    let isMounted = true;
    getPwaReviews(pwaSlug)
      .then((data) => {
        if (isMounted) {
          setReviews(data);
          setLoadingReviews(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch initial reviews:", err);
        if (isMounted) setLoadingReviews(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pwaSlug]);

  // Check for existing user review when authenticated
  useEffect(() => {
    if (user?.uid && pwaSlug) {
      getUserPwaReview(pwaSlug, user.uid).then((existing) => {
        if (existing) {
          setSelectedRating(existing.rating || 5);
          setComment(existing.comment || "");
          setIsExistingReview(true);
        }
      });
    }
  }, [user, pwaSlug]);

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    if (selectedRating < 1 || selectedRating > 5) {
      await showErrorAlert({
        title: "Invalid Rating",
        text: "Please select a rating between 1 and 5 stars.",
      });
      return;
    }

    if (comment.length > 1000) {
      await showErrorAlert({
        title: "Review Too Long",
        text: "Review text cannot exceed 1000 characters.",
      });
      return;
    }

    setSubmitting(true);
    showLoadingAlert({
      title: isExistingReview ? "Updating Rating..." : "Submitting Rating...",
      text: "Recording your feedback in the marketplace.",
    });

    try {
      const idToken = await user.getIdToken();
      const res = await submitPwaRating({
        pwaId: pwaSlug,
        rating: selectedRating,
        comment: comment.trim(),
        idToken,
      });

      if (res.ok) {
        if (typeof res.ratingAverage === "number") setRatingAverage(res.ratingAverage);
        if (typeof res.ratingCount === "number") setRatingCount(res.ratingCount);
        setIsExistingReview(true);

        await showSuccessAlert({
          title: isExistingReview ? "Rating Updated!" : "Rating Submitted!",
          text: isExistingReview
            ? `Your rating for "${appTitle}" has been updated.`
            : `Thank you for rating "${appTitle}"!`,
          timer: 2000,
        });

        // Reload reviews list
        refreshReviews();
      } else {
        await showErrorAlert({
          title: "Submission Error",
          error: res.error || "Could not submit rating.",
        });
      }
    } catch (err) {
      await showErrorAlert({
        title: "Error",
        error: err,
        text: "An unexpected network error occurred.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const hasRatings = ratingCount > 0 && ratingAverage > 0;

  return (
    <section className="bg-(--card) rounded-2xl border border-(--line) p-6 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-(--line) gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-(--gold)" />
            <h2 className="font-display text-2xl font-medium text-(--ink) tracking-tight">
              Ratings & Reviews
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-(--body)">
            Verified user ratings and feedback from the Likha Apps community.
          </p>
        </div>

        {/* Aggregate Score Display */}
        <div className="flex items-center gap-3 bg-(--paper) px-4 py-2.5 rounded-xl border border-(--line)">
          {hasRatings ? (
            <>
              <div className="text-center">
                <span className="font-display text-3xl font-semibold text-(--ink) leading-none block">
                  {ratingAverage.toFixed(1)}
                </span>
                <span className="font-mono text-[10px] text-(--body-dim) uppercase tracking-wider block mt-0.5">
                  out of 5
                </span>
              </div>
              <div className="border-l border-(--line) pl-3 space-y-1">
                <StarRating value={ratingAverage} readOnly size="sm" />
                <span className="font-mono text-xs text-(--body) block">
                  {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-(--body-dim)">
              <Star className="w-4 h-4 text-(--body-dim)" />
              <span>No ratings yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Rating Form / Auth Callout */}
      <div className="mb-8 p-5 sm:p-6 rounded-xl bg-(--paper) border border-(--line)">
        {!hasMounted || authLoading ? (
          <div className="h-28 rounded-lg bg-(--ink)/5 animate-pulse" />
        ) : isAuthenticated ? (
          <form onSubmit={handleSubmitRating} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-(--body-dim) mb-2">
                {isExistingReview ? "Update Your Rating" : "Rate this application"}
              </label>
              <div className="flex items-center gap-3">
                <StarRating
                  value={selectedRating}
                  onChange={(r) => setSelectedRating(r)}
                  size="lg"
                />
                <span className="font-mono text-xs font-medium text-(--ink)">
                  {selectedRating === 5
                    ? "5 – Excellent"
                    : selectedRating === 4
                    ? "4 – Good"
                    : selectedRating === 3
                    ? "3 – Average"
                    : selectedRating === 2
                    ? "2 – Poor"
                    : "1 – Terrible"}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="review-comment"
                  className="text-xs font-mono text-(--body) font-medium"
                >
                  Written Feedback <span className="text-(--body-dim) font-normal">(Optional)</span>
                </label>
                <span className="font-mono text-[11px] text-(--body-dim)">
                  {comment.length}/1000
                </span>
              </div>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                placeholder="What did you like about this app? What could be improved?"
                rows={3}
                className="w-full p-3 rounded-lg border border-(--line) bg-(--card) text-(--ink) placeholder:text-(--body-dim) text-sm outline-none focus:border-(--ink) focus:ring-1 focus:ring-(--ink) transition-colors resize-y"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-(--coral) hover:bg-[#e85a3e] text-white h-10 px-5 text-xs font-medium rounded-md shadow-none flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isExistingReview ? "Update Rating" : "Submit Rating"}</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-(--ink)/5 flex items-center justify-center text-(--body-dim) shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-(--ink) font-display">
                  Have you used {appTitle}?
                </h3>
                <p className="text-xs text-(--body)">
                  Sign in to submit a rating and share your experience with the community.
                </p>
              </div>
            </div>
            <Link href="/login">
              <Button
                variant="outline"
                className="border-(--line) bg-(--card) hover:bg-(--ink-soft) text-(--ink) text-xs font-mono h-9 px-4 shrink-0"
              >
                Log In to Rate
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Community Reviews List */}
      <div>
        <h3 className="font-display text-lg font-medium text-(--ink) mb-4">
          Community Reviews
        </h3>

        {loadingReviews ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-(--paper) border border-(--line) animate-pulse"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center rounded-xl bg-(--paper) border border-dashed border-(--line) px-4">
            <MessageSquare className="w-6 h-6 mx-auto text-(--body-dim) mb-2" />
            <p className="text-xs font-mono text-(--body-dim)">
              No written reviews yet. Be the first to leave feedback!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-xl bg-(--paper) border border-(--line) space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center text-xs font-bold uppercase">
                      {rev.userName ? rev.userName[0] : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="font-medium text-xs text-(--ink) block leading-tight">
                        {rev.userName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating value={rev.rating} readOnly size="sm" />
                    <span className="text-[11px] font-mono text-(--body-dim)">
                      {new Date(rev.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-xs sm:text-sm text-(--body) leading-relaxed pt-1 whitespace-pre-line">
                    {rev.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
