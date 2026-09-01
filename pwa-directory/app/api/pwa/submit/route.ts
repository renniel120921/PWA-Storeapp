import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateServerRequest,
  promoteDraftSubmission,
  SubmissionServiceError,
} from "@/lib/services/submission.service";

const SubmitRequestBodySchema = z.object({
  submissionId: z
    .string()
    .trim()
    .min(1, "submissionId is required.")
    .max(128, "submissionId is invalid."),
});

/**
 * POST /api/pwa/submit
 * Promotes an existing 'draft' submission to 'pending' review after
 * verifying developer ownership, Zod data model constraints, and live URL reachability.
 */
export async function POST(request: Request) {
  try {
    // 1. Content-Type Check
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Content-Type. Expected application/json.",
        },
        { status: 415 }
      );
    }

    // 2. Authoritative Token Authentication
    const session = await authenticateServerRequest(request);

    // 3. Parse JSON Body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Malformed JSON payload in request body.",
        },
        { status: 400 }
      );
    }

    // 4. Schema Validation
    const parseResult = SubmitRequestBodySchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues?.[0];
      const errorMessage = firstIssue ? firstIssue.message : "Invalid request body.";
      return NextResponse.json(
        {
          ok: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }

    const { submissionId } = parseResult.data;

    // 5. Execute Business Logic: Ownership & Draft -> Pending Promotion
    const result = await promoteDraftSubmission(submissionId, session.uid);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof SubmissionServiceError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
        },
        { status: err.statusCode }
      );
    }

    console.error("Unhandled error in /api/pwa/submit route handler:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "An unexpected server error occurred while processing your submission.",
      },
      { status: 500 }
    );
  }
}

