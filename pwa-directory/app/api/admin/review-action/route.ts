import { NextResponse } from "next/server";
import {
  authenticateAdminServerRequest,
  approveSubmissionServer,
  rejectSubmissionServer,
  AdminActionError,
} from "@/lib/services/admin-server.service";

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
      return NextResponse.json(result, { status: 200 });
    } else {
      const result = await rejectSubmissionServer(
        submissionId,
        session.uid,
        typeof reason === "string" ? reason : ""
      );
      return NextResponse.json(result, { status: 200 });
    }
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("Unexpected error in /api/admin/review-action:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error occurred while processing review action." },
      { status: 500 }
    );
  }
}

