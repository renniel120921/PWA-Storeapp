import "server-only";
import { NextResponse } from "next/server";
import {
  authenticateAdminServerRequest,
  approveSubmissionServer,
  rejectSubmissionServer,
  AdminActionError,
} from "@/lib/services/admin-server.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // 1. Authenticate and verify admin privilege
    const session = await authenticateAdminServerRequest(request);

    // 2. Parse request payload
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { submissionId, action, reason } = body;

    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Field 'submissionId' is required and must be a string." },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { ok: false, error: "Field 'action' must be either 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    // 3. Process approval or rejection
    if (action === "approve") {
      const result = await approveSubmissionServer(submissionId, session.uid);
      console.info(
        `[Admin Review Action][SUCCESS] Approved submission (${submissionId}) with slug: ${result.slug}`
      );
      return NextResponse.json(result, { status: 200 });
    } else {
      const result = await rejectSubmissionServer(
        submissionId,
        session.uid,
        typeof reason === "string" ? reason : ""
      );
      console.info(
        `[Admin Review Action][SUCCESS] Rejected submission (${submissionId})`
      );
      return NextResponse.json(result, { status: 200 });
    }
  } catch (error) {
    if (error instanceof AdminActionError) {
      console.warn(`[Admin Review Action][${error.statusCode}] ${error.message}`);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.error(
      "[Admin Review Action][FIRESTORE_TRANSACTION_FAILED] Unexpected server exception in /api/admin/review-action:",
      error
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error occurred while processing review decision. Please check database connectivity.",
      },
      { status: 500 }
    );
  }
}
