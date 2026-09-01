import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPwaUrl } from "@/lib/services/pwa-verifier.service";

const VerifyRequestBodySchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required.")
    .max(2048, "URL is too long."),
});

/**
 * POST /api/pwa/verify
 * Inspects a target HTTPS URL for reachability, web app manifest, icons, and service worker.
 * Enforces strict SSRF protection and response size bounds.
 */
export async function POST(request: Request) {
  try {
    // 1. Content-Type Validation
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

    // 2. Parse JSON Payload
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

    // 3. Schema Validation
    const parseResult = VerifyRequestBodySchema.safeParse(body);
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

    const { url } = parseResult.data;

    // 4. Execute SSRF-Safe PWA Verification
    const verification = await verifyPwaUrl(url);

    // If initial SSRF or reachability failed, return structured 200 or 422
    if (!verification.checks.https) {
      return NextResponse.json(
        {
          ok: false,
          url,
          error: verification.errors[0] || "URL must be a valid HTTPS address.",
          checks: verification.checks,
          errors: verification.errors,
          warnings: verification.warnings,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(verification, { status: 200 });
  } catch (err: unknown) {
    // Catch-all: log internally, return safe generic error to client
    console.error("Unhandled error in /api/pwa/verify route handler:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "An error occurred while verifying the PWA URL. Please check the URL and try again.",
      },
      { status: 500 }
    );
  }
}
