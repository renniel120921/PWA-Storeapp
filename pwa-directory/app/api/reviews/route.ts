import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";
import { ReviewSchema } from "@/lib/validators/pwa.validator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reviews?pwaId=[slug]
 * Public endpoint to fetch published reviews for an approved application.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pwaId = searchParams.get("pwaId");

    if (!pwaId || typeof pwaId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing required query parameter: pwaId" },
        { status: 400 }
      );
    }

    const reviewsSnap = await adminDb
      .collection("reviews")
      .where("pwaId", "==", pwaId)
      .where("status", "==", "published")
      .limit(50)
      .get();

    const reviews = reviewsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        pwaId: data.pwaId || pwaId,
        userId: data.userId || "",
        userName: data.userName || "Verified User",
        userAvatar: data.userAvatar || null,
        rating: data.rating || 5,
        comment: data.comment || "",
        status: data.status || "published",
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
      };
    });

    // Sort newest first in memory
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ ok: true, reviews });
  } catch (error) {
    console.error("[GET /api/reviews] Error fetching reviews:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load application reviews." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Authenticated endpoint for users to submit or update a star rating and review.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract and verify ID token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in to rate this app." },
        { status: 401 }
      );
    }

    const idToken = authHeader.split(" ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired session. Please log in again." },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    if (!uid) {
      return NextResponse.json(
        { ok: false, error: "User identity could not be verified." },
        { status: 401 }
      );
    }

    // 2. Parse and validate payload
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const parseResult = ReviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: parseResult.error.issues[0]?.message || "Validation failed." },
        { status: 422 }
      );
    }

    const { pwaId, rating, comment } = parseResult.data;

    // 3. Fetch user profile for reviewer display name
    let reviewerName = decodedToken.name || decodedToken.email?.split("@")[0] || "Verified User";
    let reviewerAvatar = decodedToken.picture || null;

    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.fullName) reviewerName = userData.fullName;
        else if (userData?.firstName) reviewerName = `${userData.firstName} ${userData.lastName || ""}`.trim();
        if (userData?.avatarUrl) reviewerAvatar = userData.avatarUrl;
      }
    } catch (err) {
      console.warn("[POST /api/reviews] Could not read user profile doc:", err);
    }

    const reviewDocId = `${uid}_${pwaId}`;
    const reviewRef = adminDb.collection("reviews").doc(reviewDocId);
    const pwaRef = adminDb.collection("pwas").doc(pwaId);

    // 4. Atomic Firestore Transaction for 1-Rating-Per-User & Aggregate Sync
    const transactionResult = await adminDb.runTransaction(async (transaction) => {
      // A. Verify target PWA is approved
      const pwaSnap = await transaction.get(pwaRef);
      if (!pwaSnap.exists) {
        throw new Error("PWA_NOT_FOUND");
      }

      const pwaData = pwaSnap.data();
      if (!pwaData || pwaData.status !== "approved") {
        throw new Error("PWA_NOT_APPROVED");
      }

      // Developer Self-Rating Prevention: Developers may not review their own applications
      if (pwaData.developerId && pwaData.developerId === uid) {
        throw new Error("SELF_RATING_FORBIDDEN");
      }

      // B. Check for existing review by this user
      const reviewSnap = await transaction.get(reviewRef);
      const isUpdate = reviewSnap.exists;
      const existingReview = isUpdate ? reviewSnap.data() : null;

      let newCount = pwaData.ratingCount || 0;
      let newAverage = pwaData.ratingAverage || 0;

      if (isUpdate && existingReview) {
        // Adjust existing rating without incrementing count
        const oldRating = typeof existingReview.rating === "number" ? existingReview.rating : 5;
        const currentCount = Math.max(newCount, 1);
        const oldTotalSum = (pwaData.ratingAverage || oldRating) * currentCount;
        const newTotalSum = Math.max(0, oldTotalSum - oldRating + rating);
        newAverage = Number((newTotalSum / currentCount).toFixed(1));
        newCount = currentCount;
      } else {
        // New rating: increment count and calculate new average
        const oldCount = pwaData.ratingCount || 0;
        const oldAverage = pwaData.ratingAverage || 0;
        newCount = oldCount + 1;
        const newTotalSum = (oldAverage * oldCount) + rating;
        newAverage = Number((newTotalSum / newCount).toFixed(1));
      }

      // C. Set Review Document
      const reviewPayload: Record<string, unknown> = {
        id: reviewDocId,
        pwaId: pwaId,
        userId: uid,
        userName: reviewerName,
        userAvatar: reviewerAvatar,
        rating: rating,
        comment: comment || "",
        status: "published",
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!isUpdate) {
        reviewPayload.createdAt = FieldValue.serverTimestamp();
      }

      transaction.set(reviewRef, reviewPayload, { merge: true });

      // D. Update PWA Aggregates
      transaction.update(pwaRef, {
        ratingAverage: newAverage,
        ratingCount: newCount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        isUpdate,
        ratingAverage: newAverage,
        ratingCount: newCount,
      };
    });

    return NextResponse.json({
      ok: true,
      isUpdate: transactionResult.isUpdate,
      ratingAverage: transactionResult.ratingAverage,
      ratingCount: transactionResult.ratingCount,
      message: transactionResult.isUpdate
        ? "Your rating and feedback have been updated."
        : "Thank you! Your rating has been submitted.",
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/reviews] Error submitting review:", error);

    if (errMessage.includes("PWA_NOT_FOUND")) {
      return NextResponse.json(
        { ok: false, error: "The application could not be found." },
        { status: 404 }
      );
    }

    if (errMessage.includes("SELF_RATING_FORBIDDEN")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Marketplace policy does not permit developers to rate or review their own applications.",
        },
        { status: 403 }
      );
    }

    if (errMessage.includes("PWA_NOT_APPROVED")) {
      return NextResponse.json(
        { ok: false, error: "Only approved public applications can receive ratings." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to submit rating. Please try again later." },
      { status: 500 }
    );
  }
}

