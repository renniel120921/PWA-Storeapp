import "server-only";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";
import {
  notifyDeveloperOfApproval,
  notifyDeveloperOfRejection,
} from "@/lib/services/notification-server.service";
import type { UserRole } from "@/types";

export class AdminActionError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AdminActionError";
  }
}

export interface AdminSession {
  uid: string;
  email?: string;
  role: UserRole;
}

/**
 * Authenticates the request and verifies caller has role === 'admin'.
 */
export async function authenticateAdminServerRequest(
  request: Request
): Promise<AdminSession> {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new AdminActionError(401, "Authentication required. Missing Bearer token.");
  }

  const token = authHeader.replace(/^Bearer\s+/, "").trim();
  if (!token) {
    throw new AdminActionError(401, "Authentication token is empty.");
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // Check custom claims and fallback to Firestore user document
    const isCustomClaimAdmin = decodedToken.admin === true || decodedToken.role === "admin";
    let isFirestoreAdmin = false;

    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists && userDoc.data()?.role === "admin") {
        isFirestoreAdmin = true;
      }
    } catch (dbErr) {
      console.warn("[Admin Review Action] Firestore profile read warning:", dbErr);
    }

    if (!isCustomClaimAdmin && !isFirestoreAdmin) {
      throw new AdminActionError(403, "Forbidden: Administrator role required.");
    }

    return { uid, email, role: "admin" };
  } catch (err) {
    if (err instanceof AdminActionError) {
      throw err;
    }
    console.error("Admin token verification error:", err);
    throw new AdminActionError(401, "Invalid or expired admin session.");
  }
}

/**
 * Generates a clean, unique, URL-safe slug for an approved PWA.
 */
export async function generateUniquePwaSlug(title: string): Promise<string> {
  const baseSlug =
    title
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, "") || // Trim leading/trailing hyphens
    "app";

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingDoc = await adminDb.collection("pwas").doc(slug).get();
    if (!existingDoc.exists) {
      return slug;
    }
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

/**
 * Approves a pending submission:
 * 1. Verifies submission exists & status == 'pending'
 * 2. Generates unique slug
 * 3. Atomically creates master document in pwas/{slug}
 * 4. Atomically marks submission as approved with reviewerId and reviewedAt
 */
export async function approveSubmissionServer(
  submissionId: string,
  adminUid: string
): Promise<{ ok: boolean; action: "approve"; submissionId: string; status: "approved"; slug: string }> {
  if (!submissionId) {
    throw new AdminActionError(400, "submissionId is required.");
  }

  const submissionRef = adminDb.collection("submissions").doc(submissionId);
  const snapshot = await submissionRef.get();

  if (!snapshot.exists) {
    throw new AdminActionError(404, `Submission "${submissionId}" was not found.`);
  }

  const subData = snapshot.data();
  if (!subData) {
    throw new AdminActionError(404, "Submission data is empty.");
  }

  if (subData.status !== "pending") {
    throw new AdminActionError(
      409,
      `Cannot approve submission with status "${subData.status}". Only "pending" submissions can be approved.`
    );
  }

  // Generate unique slug
  const title = subData.title || subData.draftData?.title || "Untitled App";
  const slug = await generateUniquePwaSlug(title);
  const pwaRef = adminDb.collection("pwas").doc(slug);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const liveSub = await transaction.get(submissionRef);
      if (!liveSub.exists) {
        throw new AdminActionError(404, "Submission missing during transaction.");
      }

      const liveData = liveSub.data();
      if (liveData?.status !== "pending") {
        throw new AdminActionError(
          409,
          `Conflict: Submission status changed concurrently to "${liveData?.status}".`
        );
      }

      const livePwa = await transaction.get(pwaRef);
      if (livePwa.exists) {
        throw new AdminActionError(409, `Conflict: A PWA listing with slug "${slug}" already exists.`);
      }

      const appUrl = subData.appUrl || subData.app_url || subData.draftData?.appUrl || "";
      const categories = Array.isArray(subData.categories)
        ? subData.categories
        : subData.primaryCategory
        ? [subData.primaryCategory]
        : ["tools"];
      const primaryCat = subData.primaryCategory || categories[0] || "tools";

      // 1. Create master public PWA listing with clean, sanitized payload (no undefined values)
      const pwaData: Record<string, unknown> = {
        id: slug,
        slug: slug,
        submissionId: submissionId,
        developerId: subData.developerId || liveData?.developerId || "",
        developerName: subData.developerName || liveData?.developerName || "Independent Developer",
        title: title,
        tagline: subData.tagline || subData.draftData?.tagline || "",
        description: subData.description || subData.draftData?.description || "",
        appUrl: appUrl,
        app_url: appUrl,
        iconUrl: subData.iconUrl || subData.draftData?.iconUrl || "",
        screenshots: Array.isArray(subData.screenshots) ? subData.screenshots : [],
        primaryCategory: primaryCat,
        categories: categories,
        tags: Array.isArray(subData.tags) ? subData.tags : [],
        pricing: subData.pricing || "free",
        status: "approved",
        isFeatured: false,
        viewsCount: 0,
        clicksCount: 0,
        ratingAverage: 0,
        ratingCount: 0,
        createdAt: subData.createdAt || liveData?.createdAt || FieldValue.serverTimestamp(),
        submittedAt: subData.submittedAt || liveData?.submittedAt || FieldValue.serverTimestamp(),
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const devEmail = subData.developerEmail || liveData?.developerEmail;
      if (devEmail) pwaData.developerEmail = devEmail;

      const devWebsite = subData.developerWebsite || liveData?.developerWebsite;
      if (devWebsite) pwaData.developerWebsite = devWebsite;

      const manifest = subData.manifestUrl || liveData?.manifestUrl;
      if (manifest) pwaData.manifestUrl = manifest;

      transaction.set(pwaRef, pwaData);

      // 2. Update submission status to approved
      transaction.update(submissionRef, {
        status: "approved",
        slug: slug,
        reviewerId: adminUid,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // Trigger real-time notification for developer
    await notifyDeveloperOfApproval({
      developerId: subData.developerId || "",
      submissionId,
      pwaSlug: slug,
      appTitle: title,
    });

    return {
      ok: true,
      action: "approve",
      submissionId,
      status: "approved",
      slug,
    };
  } catch (err) {
    if (err instanceof AdminActionError) {
      throw err;
    }
    console.error("Firestore transaction failed during approval:", err);
    throw new AdminActionError(500, "Database transaction failed while approving submission.");
  }
}

/**
 * Rejects a pending submission with reviewer feedback:
 * 1. Verifies status == 'pending'
 * 2. Requires a clear reason
 * 3. Atomically marks submission as rejected with rejectionReason, reviewerId, reviewedAt
 */
export async function rejectSubmissionServer(
  submissionId: string,
  adminUid: string,
  reason: string
): Promise<{ ok: boolean; action: "reject"; submissionId: string; status: "rejected" }> {
  if (!submissionId) {
    throw new AdminActionError(400, "submissionId is required.");
  }

  const trimmedReason = (reason || "").trim();
  if (!trimmedReason || trimmedReason.length < 5) {
    throw new AdminActionError(422, "Please provide a valid rejection reason of at least 5 characters.");
  }

  const submissionRef = adminDb.collection("submissions").doc(submissionId);
  const snapshot = await submissionRef.get();

  if (!snapshot.exists) {
    throw new AdminActionError(404, `Submission "${submissionId}" was not found.`);
  }

  const subData = snapshot.data();
  if (subData?.status !== "pending") {
    throw new AdminActionError(
      409,
      `Cannot reject submission with status "${subData?.status}". Only "pending" submissions can be rejected.`
    );
  }

  try {
    await adminDb.runTransaction(async (transaction) => {
      const liveSub = await transaction.get(submissionRef);
      if (!liveSub.exists) {
        throw new AdminActionError(404, "Submission missing during transaction.");
      }

      const liveData = liveSub.data();
      if (liveData?.status !== "pending") {
        throw new AdminActionError(
          409,
          `Conflict: Submission status changed concurrently to "${liveData?.status}".`
        );
      }

      transaction.update(submissionRef, {
        status: "rejected",
        rejectionReason: trimmedReason,
        reviewNotes: trimmedReason,
        reviewerId: adminUid,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // Trigger real-time notification for developer
    await notifyDeveloperOfRejection({
      developerId: subData.developerId || "",
      submissionId,
      appTitle: subData.title || subData.draftData?.title || "Application",
      reason: trimmedReason,
    });

    return {
      ok: true,
      action: "reject",
      submissionId,
      status: "rejected",
    };
  } catch (err) {
    if (err instanceof AdminActionError) {
      throw err;
    }
    console.error("Firestore transaction failed during rejection:", err);
    throw new AdminActionError(500, "Database transaction failed while rejecting submission.");
  }
}
