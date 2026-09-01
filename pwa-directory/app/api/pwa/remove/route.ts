import "server-only";
import { NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Missing Bearer token." },
        { status: 401 }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/, "").trim();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Authentication token is empty." },
        { status: 401 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 2. Parse payload
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { slug } = body;
    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { ok: false, error: "Field 'slug' is required and must be a string." },
        { status: 400 }
      );
    }

    const pwaRef = adminDb.collection("pwas").doc(slug);
    const pwaSnap = await pwaRef.get();

    if (!pwaSnap.exists) {
      return NextResponse.json(
        { ok: false, error: `Listing with slug "${slug}" was not found.` },
        { status: 404 }
      );
    }

    const pwaData = pwaSnap.data();
    if (!pwaData) {
      return NextResponse.json(
        { ok: false, error: "Listing data is empty." },
        { status: 404 }
      );
    }

    // 3. Authorization Check: Must be the developer who owns the PWA, or an Admin
    const isOwner = pwaData.developerId === uid;
    let isAdmin = decodedToken.admin === true || decodedToken.role === "admin";

    if (!isAdmin && !isOwner) {
      // Check user document for admin role
      try {
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (userDoc.exists && userDoc.data()?.role === "admin") {
          isAdmin = true;
        }
      } catch (err) {
        console.warn("[PWA Remove] Error checking admin status:", err);
      }
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: You are not authorized to remove this listing." },
        { status: 403 }
      );
    }

    // 4. Validate Status: Can only remove currently approved listings
    if (pwaData.status !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          error: `Listing is currently "${pwaData.status}". Only approved listings can be removed.`,
        },
        { status: 409 }
      );
    }

    // 5. Execute State Transition: approved -> suspended (unlisted from public directory)
    await adminDb.runTransaction(async (transaction) => {
      const livePwa = await transaction.get(pwaRef);
      if (!livePwa.exists) {
        throw new Error("PWA document missing during transaction.");
      }

      transaction.update(pwaRef, {
        status: "suspended",
        unlistedAt: FieldValue.serverTimestamp(),
        unlistedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const submissionId = pwaData.submissionId;
      if (submissionId && typeof submissionId === "string") {
        const subRef = adminDb.collection("submissions").doc(submissionId);
        const liveSub = await transaction.get(subRef);
        if (liveSub.exists) {
          transaction.update(subRef, {
            status: "suspended",
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    });

    console.info(`[PWA Remove][SUCCESS] Listing "${slug}" unlisted by UID: ${uid}`);

    return NextResponse.json(
      {
        ok: true,
        slug,
        status: "suspended",
        message: "Listing has been unpublished from the public directory.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PWA Remove][ERROR] Unexpected error in /api/pwa/remove:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error occurred while removing listing." },
      { status: 500 }
    );
  }
}

