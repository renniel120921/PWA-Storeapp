import "server-only";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminAuth, adminDb, getAdminCredentialStatus } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // 1. Ensure bootstrap secret is configured in the environment
    const configuredSecret = process.env.LIKHA_ADMIN_BOOTSTRAP_SECRET;
    if (!configuredSecret || configuredSecret.trim().length < 16) {
      console.warn("[Admin Bootstrap][BOOTSTRAP_SECRET_MISSING] LIKHA_ADMIN_BOOTSTRAP_SECRET is missing or under 16 characters.");
      return NextResponse.json(
        {
          ok: false,
          error:
            "Admin bootstrap is disabled or unconfigured on this server. Set LIKHA_ADMIN_BOOTSTRAP_SECRET in Vercel environment variables (minimum 16 characters).",
        },
        { status: 403 }
      );
    }

    // 2. Check if Firebase Admin SDK has valid server credentials
    const credStatus = getAdminCredentialStatus();
    if (!credStatus.configured) {
      console.error(
        `[Admin Bootstrap][${credStatus.classification}] ${credStatus.diagnostic}`
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "Firebase Admin credentials are not properly configured on this server (FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY missing or invalid in Vercel Production environment).",
        },
        { status: 500 }
      );
    }

    // 3. Extract and verify Firebase ID Token from Authorization header
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[Admin Bootstrap][AUTH_TOKEN_MISSING] Request missing Bearer Authorization header.");
      return NextResponse.json(
        { ok: false, error: "Authentication required. Missing Bearer token in Authorization header." },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace(/^Bearer\s+/, "").trim();
    if (!idToken) {
      console.warn("[Admin Bootstrap][AUTH_TOKEN_EMPTY] Bearer token string is empty.");
      return NextResponse.json(
        { ok: false, error: "Authentication token is empty." },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      console.warn("[Admin Bootstrap][AUTH_TOKEN_INVALID] Token verification rejected by Firebase Auth.");
      return NextResponse.json(
        { ok: false, error: "Your session token is invalid or has expired. Please log in again." },
        { status: 401 }
      );
    }

    const authenticatedUid = decodedToken.uid;
    const authenticatedEmail = decodedToken.email || "";

    // 4. Parse and validate bootstrap secret payload
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      console.warn("[Admin Bootstrap][PAYLOAD_INVALID] Failed to parse request JSON body.");
      return NextResponse.json(
        { ok: false, error: "Invalid JSON request body. Expected { secret: string }." },
        { status: 400 }
      );
    }

    const providedSecret = typeof body.secret === "string" ? body.secret.trim() : "";
    const cleanConfiguredSecret = configuredSecret.trim();

    const bufConfigured = Buffer.from(cleanConfiguredSecret);
    const bufProvided = Buffer.from(providedSecret);

    if (
      bufConfigured.length !== bufProvided.length ||
      !crypto.timingSafeEqual(bufConfigured, bufProvided)
    ) {
      console.warn("[Admin Bootstrap][SECRET_MISMATCH] Provided secret did not match configured server secret.");
      return NextResponse.json(
        { ok: false, error: "Invalid bootstrap secret. Please double-check your secret key." },
        { status: 403 }
      );
    }

    // 5. Promote the authenticated user's own account in Firestore
    try {
      const userRef = adminDb.collection("users").doc(authenticatedUid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        // Create user profile document with admin role if not present
        await userRef.set({
          uid: authenticatedUid,
          email: authenticatedEmail,
          fullName: decodedToken.name || "Administrator",
          role: "admin",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          promotedVia: "bootstrap",
        });
      } else {
        const existingData = userSnap.data();
        if (existingData?.role === "admin") {
          return NextResponse.json(
            {
              ok: true,
              message: `Account (${authenticatedEmail || authenticatedUid}) is already an administrator.`,
              uid: authenticatedUid,
              role: "admin",
            },
            { status: 200 }
          );
        }

        await userRef.update({
          role: "admin",
          updatedAt: FieldValue.serverTimestamp(),
          promotedVia: "bootstrap",
        });
      }
    } catch {
      console.error("[Admin Bootstrap][FIRESTORE_WRITE_FAILED] Firestore document update threw an error.");
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to update user profile in Firestore. Check Firestore permissions and database availability.",
        },
        { status: 500 }
      );
    }

    // 6. Update Firebase Auth custom claims for instant session synchronization
    try {
      await adminAuth.setCustomUserClaims(authenticatedUid, {
        role: "admin",
        admin: true,
      });
    } catch {
      console.warn("[Admin Bootstrap][CLAIMS_UPDATE_FAILED] Custom claims could not be applied; Firestore document was successfully updated.");
    }

    console.info(`[Admin Bootstrap][SUCCESS] Successfully promoted account (${authenticatedUid}) to admin role.`);

    return NextResponse.json(
      {
        ok: true,
        message: `Successfully promoted account (${authenticatedEmail || authenticatedUid}) to administrator.`,
        uid: authenticatedUid,
        role: "admin",
      },
      { status: 200 }
    );
  } catch {
    console.error("[Admin Bootstrap][UNKNOWN] Unhandled exception occurred during admin bootstrap.");
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error occurred during admin promotion. Please check Vercel server function logs.",
      },
      { status: 500 }
    );
  }
}
