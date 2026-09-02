import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Pwa } from "@/types";

/**
 * Extended PWA item with calculated ranking metadata.
 */
export interface RankedPwa extends Pwa {
  rank: number;
  rankingScore: number;
}

/**
 * Configurable minimum rating confidence threshold (m).
 */
export const DEFAULT_MIN_RATINGS_THRESHOLD = 10;

/**
 * Fallback global average rating (C) baseline prior.
 */
export const DEFAULT_GLOBAL_RATING_MEAN = 3.0;

/**
 * Pure calculation function that computes Bayesian weighted ranking scores
 * and assigns deterministic ranks with tie-breaking.
 *
 * Formula:
 *   score = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * Where:
 *   R = app.ratingAverage
 *   v = app.ratingCount
 *   C = weighted marketplace/category prior mean
 *   m = minRatingsThreshold (default 10)
 */
export function calculateAppRankings(
  pwas: Pwa[],
  options?: {
    category?: string;
    minRatingsThreshold?: number;
  }
): RankedPwa[] {
  const m = options?.minRatingsThreshold ?? DEFAULT_MIN_RATINGS_THRESHOLD;
  const category = options?.category?.toLowerCase().trim();

  // 1. Filter eligible apps: status == "approved", ratingCount > 0, ratingAverage > 0
  const eligible = pwas.filter((app) => {
    if (app.status !== "approved") return false;
    if (!app.ratingCount || app.ratingCount <= 0) return false;
    if (!app.ratingAverage || app.ratingAverage <= 0) return false;

    if (category && category !== "all") {
      const primary = (app.primaryCategory || "").toLowerCase();
      const cats = Array.isArray(app.categories)
        ? app.categories.map((c) => c.toLowerCase())
        : [];
      const matchesCategory = primary === category || cats.includes(category);
      if (!matchesCategory) return false;
    }

    return true;
  });

  if (eligible.length === 0) {
    return [];
  }

  // 2. Calculate prior expectation C for the eligible pool
  const totalVotes = eligible.reduce((acc, app) => acc + app.ratingCount, 0);
  const totalVoteWeight = eligible.reduce(
    (acc, app) => acc + app.ratingAverage * app.ratingCount,
    0
  );
  const C =
    (totalVoteWeight + m * DEFAULT_GLOBAL_RATING_MEAN) / (totalVotes + m);

  // 3. Compute Bayesian score for each app
  const scoredApps = eligible.map((app) => {
    const R = app.ratingAverage;
    const v = app.ratingCount;

    // score = (v / (v + m)) * R + (m / (v + m)) * C
    const score = (v / (v + m)) * R + (m / (v + m)) * C;

    return {
      ...app,
      rankingScore: score,
    };
  });

  // 4. Sort with strict deterministic tie-breaking
  scoredApps.sort((a, b) => {
    // 1. Score comparison (precision 1e-6)
    const scoreDiff = b.rankingScore - a.rankingScore;
    if (Math.abs(scoreDiff) > 1e-6) {
      return scoreDiff;
    }

    // 2. Higher rating count
    const countDiff = b.ratingCount - a.ratingCount;
    if (countDiff !== 0) {
      return countDiff;
    }

    // 3. Higher raw rating average
    const avgDiff = b.ratingAverage - a.ratingAverage;
    if (Math.abs(avgDiff) > 1e-6) {
      return avgDiff;
    }

    // 4. Stable alphabetical title
    return (a.title || "").localeCompare(b.title || "");
  });

  // 5. Assign sequential rank numbers (1-indexed)
  return scoredApps.map((app, index) => ({
    ...app,
    rank: index + 1,
  }));
}

/**
 * Retrieves approved PWAs from Firestore in a single query and returns
 * the calculated ranked leaderboard without N+1 requests.
 */
export async function getRankedPwas(options?: {
  category?: string;
  limitCount?: number;
  minRatingsThreshold?: number;
}): Promise<RankedPwa[]> {
  try {
    const pwasRef = collection(db, "pwas");
    const approvedQuery = query(
      pwasRef,
      where("status", "==", "approved"),
      limit(200)
    );

    const snapshot = await getDocs(approvedQuery);
    const pwas: Pwa[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const categories = Array.isArray(data.categories) ? (data.categories as string[]) : [];
      const primaryCat =
        typeof data.primaryCategory === "string" && data.primaryCategory
          ? data.primaryCategory
          : categories.length > 0
          ? categories[0]
          : "tools";

      const appUrl =
        typeof data.appUrl === "string"
          ? data.appUrl
          : typeof data.app_url === "string"
          ? data.app_url
          : "";

      pwas.push({
        id: docSnap.id,
        slug: typeof data.slug === "string" ? data.slug : docSnap.id,
        developerId: typeof data.developerId === "string" ? data.developerId : "",
        developerName:
          typeof data.developerName === "string" ? data.developerName : "Independent Developer",
        title: typeof data.title === "string" ? data.title : "Untitled App",
        tagline: typeof data.tagline === "string" ? data.tagline : "",
        description: typeof data.description === "string" ? data.description : "",
        appUrl,
        app_url: appUrl,
        iconUrl: typeof data.iconUrl === "string" ? data.iconUrl : "",
        screenshots: Array.isArray(data.screenshots) ? (data.screenshots as string[]) : [],
        primaryCategory: primaryCat,
        categories: categories,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
        pricing: data.pricing === "freemium" || data.pricing === "paid" ? data.pricing : "free",
        status: "approved",
        isFeatured: Boolean(data.isFeatured),
        viewsCount: typeof data.viewsCount === "number" ? data.viewsCount : 0,
        clicksCount: typeof data.clicksCount === "number" ? data.clicksCount : 0,
        ratingAverage: typeof data.ratingAverage === "number" ? data.ratingAverage : 0,
        ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : 0,
        submittedAt: (data.submittedAt as Pwa["submittedAt"]) || null,
        approvedAt: (data.approvedAt as Pwa["approvedAt"]) || null,
        updatedAt: (data.updatedAt as Pwa["updatedAt"]) || null,
      });
    });

    const ranked = calculateAppRankings(pwas, {
      category: options?.category,
      minRatingsThreshold: options?.minRatingsThreshold,
    });

    if (options?.limitCount && options.limitCount > 0) {
      return ranked.slice(0, options.limitCount);
    }

    return ranked;
  } catch (err) {
    console.error("[Ranking Service] Error fetching and calculating rankings:", err);
    return [];
  }
}
