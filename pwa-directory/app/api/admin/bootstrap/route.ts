import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    // 1. Ensure bootstrap secret is configured on the server
    const configuredSecret = process.env.LIKHA_ADMIN_BOOTSTRAP_SECRET;
    if (!configuredSecret || configuredSecret.trim().length < 16) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Admin bootstrap is disabled or unconfigured on this server. Set LIKHA_ADMIN_BOOTSTRAP_SECRET to enable.",
        },
        { status: 403 }
      );
    }

    // 2. Extract and verify Firebase ID Token from Authorization header
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Authorization header with Bearer token is required." },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1]?.trim();
    if (!idToken) {
      return NextResponse.json(
        { ok: false, error: "Invalid bearer token provided." },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Authentication failed. ID token is invalid or expired." },
        { status: 401 }
      );
    }

    const authenticatedUid = decodedToken.uid;
    const authenticatedEmail = decodedToken.email || "";

    // 3. Parse and validate bootstrap secret payload
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const providedSecret = typeof body.secret === "string" ? body.secret : "";
    const bufConfigured = Buffer.from(configuredSecret);
    const bufProvided = Buffer.from(providedSecret);

    if (
      bufConfigured.length !== bufProvided.length ||
      !crypto.timingSafeEqual(bufConfigured, bufProvided)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid bootstrap secret." },
        { status: 403 }
      );
    }

    // 4. Promote the authenticated user's own account in Firestore
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

    // 5. Update Firebase Auth custom claims for instant session synchronization
    try {
      await adminAuth.setCustomUserClaims(authenticatedUid, {
        role: "admin",
        admin: true,
      });
    } catch (claimErr) {
      console.warn("Could not set custom auth claims (Firestore profile updated):", claimErr);
    }

    return NextResponse.json(
      {
        ok: true,
        message: `Successfully promoted account (${authenticatedEmail || authenticatedUid}) to administrator.`,
        uid: authenticatedUid,
        role: "admin",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin bootstrap error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error during admin bootstrap." },
      { status: 500 }
    );
  }
}

