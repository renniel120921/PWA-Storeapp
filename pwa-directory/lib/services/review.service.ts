import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Review } from "@/types";

export interface SubmitRatingParams {
  pwaId: string;
  rating: number;
  comment?: string;
  idToken: string;
}

export interface SubmitRatingResponse {
  ok: boolean;
  isUpdate?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  message?: string;
  error?: string;
}

export interface ReviewItem {
  id: string;
  pwaId: string;
  pwaSlug?: string;
  pwaTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  comment: string;
  status: string;
  createdAt: unknown;
  updatedAt?: unknown;
}

/**
 * Submit or update a user rating and optional comment via server API.
 */
export async function submitPwaRating(
  params: SubmitRatingParams
): Promise<SubmitRatingResponse> {
  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({
        pwaId: params.pwaId,
        rating: params.rating,
        comment: params.comment || "",
      }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("[review.service] submitPwaRating error:", error);
    return {
      ok: false,
      error: "Network error occurred while submitting rating. Please try again.",
    };
  }
}

/**
 * Fetch published reviews for a PWA.
 */
export async function getPwaReviews(pwaId: string): Promise<ReviewItem[]> {
  try {
    const res = await fetch(`/api/reviews?pwaId=${encodeURIComponent(pwaId)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.reviews || [];
  } catch (error) {
    console.error("[review.service] getPwaReviews error:", error);
    return [];
  }
}

/**
 * Fetch the current user's existing review for a specific PWA (if any).
 */
export async function getUserPwaReview(
  pwaId: string,
  userId: string
): Promise<Review | null> {
  try {
    const reviewRef = doc(db, "reviews", `${userId}_${pwaId}`);
    const snap = await getDoc(reviewRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Review;
    }
    return null;
  } catch (error) {
    console.warn("[review.service] getUserPwaReview error:", error);
    return null;
  }
}

/**
 * Fetch all reviews posted by a user.
 */
export async function getUserReviews(userId: string): Promise<ReviewItem[]> {
  if (!userId) return [];
  try {
    const revQuery = query(
      collection(db, "reviews"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(revQuery);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        pwaId: data.pwaId || "",
        pwaSlug: data.pwaSlug || data.pwaId || "",
        pwaTitle: data.pwaTitle || data.pwaName || "",
        userId: data.userId || "",
        userName: data.userName || "",
        userAvatar: data.userAvatar || null,
        rating: typeof data.rating === "number" ? data.rating : 0,
        comment: data.comment || "",
        status: data.status || "published",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt || null,
      } as ReviewItem;
    });
  } catch (error) {
    console.error("[review.service] getUserReviews error:", error);
    return [];
  }
}

