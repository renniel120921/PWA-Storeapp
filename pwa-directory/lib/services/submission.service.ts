import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { PwaSubmissionSchema } from "@/lib/validators/pwa.validator";
import { verifyPwaUrl, type PwaVerificationResult } from "@/lib/services/pwa-verifier.service";
import type { UserRole } from "@/types";

export interface AuthenticatedUserSession {
  uid: string;
  email?: string;
  role: UserRole;
}

export interface SubmissionPromotionResult {
  ok: boolean;
  submissionId: string;
  status: "pending";
  message: string;
  verification?: PwaVerificationResult;
}

export class SubmissionServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "SubmissionServiceError";
  }
}

/**
 * Extracts and verifies the Firebase ID token from the request Authorization header.
 * Enforces role check (developer or admin).
 */
export async function authenticateServerRequest(
  request: Request
): Promise<AuthenticatedUserSession> {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new SubmissionServiceError(
      401,
      "Authentication required. Missing or malformed Bearer token."
    );
  }

  const token = authHeader.replace(/^Bearer\s+/, "").trim();
  if (!token) {
    throw new SubmissionServiceError(
      401,
      "Authentication token is empty."
    );
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // Verify user profile in Firestore
    let role: UserRole = "developer";
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.role === "admin") {
          role = "admin";
        }
      }
    } catch (dbErr) {
      console.warn("Could not query user profile doc during auth verification:", dbErr);
    }

    return { uid, email, role };
  } catch (authErr) {
    console.error("Firebase ID Token verification failed:", authErr);
    throw new SubmissionServiceError(
      401,
      "Invalid or expired authentication session. Please log in again."
    );
  }
}

/**
 * Promotes a developer's draft submission to 'pending' review.
 * Enforces ownership, Zod schema validation, SSRF-safe URL audit, and atomic concurrency.
 */
export async function promoteDraftSubmission(
  submissionId: string,
  authenticatedUid: string
): Promise<SubmissionPromotionResult> {
  if (!submissionId || typeof submissionId !== "string" || !submissionId.trim()) {
    throw new SubmissionServiceError(400, "A valid submissionId is required.");
  }

  const submissionRef = adminDb.collection("submissions").doc(submissionId);
  const snapshot = await submissionRef.get();

  if (!snapshot.exists) {
    throw new SubmissionServiceError(
      404,
      `Submission with ID "${submissionId}" was not found.`
    );
  }

  const data = snapshot.data();
  if (!data) {
    throw new SubmissionServiceError(404, "Submission data is empty.");
  }

  // 1. Authoritative Ownership Enforcement
  if (data.developerId !== authenticatedUid) {
    throw new SubmissionServiceError(
      403,
      "You do not have permission to submit this application."
    );
  }

  // 2. Strict Status State Machine: draft -> pending ONLY
  if (data.status !== "draft") {
    throw new SubmissionServiceError(
      409,
      `Cannot submit an application with status "${data.status}". Only "draft" submissions can be submitted for review.`
    );
  }

  // 3. Complete Zod Model Validation
  const validationResult = PwaSubmissionSchema.safeParse({
    title: data.title,
    tagline: data.tagline,
    description: data.description,
    appUrl: data.appUrl || data.app_url,
    manifestUrl: data.manifestUrl,
    iconUrl: data.iconUrl,
    screenshots: data.screenshots || [],
    primaryCategory: data.primaryCategory,
    categories: data.categories || [],
    tags: data.tags || [],
    pricing: data.pricing || "free",
  });

  if (!validationResult.success) {
    const firstIssue = validationResult.error.issues[0];
    const fieldName = firstIssue.path.join(".");
    const message = firstIssue.message;
    throw new SubmissionServiceError(
      422,
      `Validation failed for field "${fieldName}": ${message}`
    );
  }

  const validatedData = validationResult.data;

  // 4. Server-side SSRF-Safe URL Audit
  const auditResult = await verifyPwaUrl(validatedData.appUrl);
  if (!auditResult.checks.https || !auditResult.checks.reachable) {
    const reason = auditResult.errors[0] || "Target URL is unreachable or not served over secure HTTPS.";
    throw new SubmissionServiceError(
      422,
      `PWA reachability check failed: ${reason}`
    );
  }

  // 5. Atomic Firestore Transaction with Concurrency Guard
  try {
    await adminDb.runTransaction(async (transaction) => {
      const liveDoc = await transaction.get(submissionRef);
      if (!liveDoc.exists) {
        throw new SubmissionServiceError(404, "Submission document not found during transaction.");
      }

      const liveData = liveDoc.data();
      if (liveData?.status !== "draft") {
        throw new SubmissionServiceError(
          409,
          `Conflict: Submission status was modified concurrently to "${liveData?.status}".`
        );
      }

      // Update state to 'pending' and record audit metadata
      transaction.update(submissionRef, {
        status: "pending",
        submittedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        reviewNotes: "",
        automatedAuditResult: {
          https: auditResult.checks.https,
          reachable: auditResult.checks.reachable,
          manifestFound: auditResult.checks.manifestFound,
          manifestValid: auditResult.checks.manifestValid,
          has192Icon: auditResult.checks.has192Icon,
          has512Icon: auditResult.checks.has512Icon,
          hasMaskableIcon: auditResult.checks.hasMaskableIcon,
          serviceWorkerDetected: auditResult.checks.serviceWorkerDetected,
          warnings: auditResult.warnings,
          auditedAt: new Date().toISOString(),
        },
      });
    });

    return {
      ok: true,
      submissionId,
      status: "pending",
      message: "Submission sent for review.",
      verification: auditResult,
    };
  } catch (err) {
    if (err instanceof SubmissionServiceError) {
      throw err;
    }
    console.error("Firestore transaction error during submission promotion:", err);
    throw new SubmissionServiceError(
      500,
      "An unexpected database error occurred while submitting your application."
    );
  }
}

