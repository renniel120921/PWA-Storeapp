import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import type { PwaStatus } from "@/types";

export interface AdminSubmissionItem {
  id: string;
  developerId: string;
  developerName: string;
  developerEmail: string;
  developerWebsite?: string;
  title: string;
  tagline: string;
  description: string;
  appUrl: string;
  manifestUrl?: string;
  iconUrl: string;
  screenshots: string[];
  primaryCategory: string;
  categories: string[];
  tags: string[];
  pricing: string;
  status: PwaStatus;
  rejectionReason?: string;
  automatedAuditResult?: {
    https: boolean;
    reachable: boolean;
    manifestFound: boolean;
    manifestValid: boolean;
    has192Icon: boolean;
    has512Icon: boolean;
    hasMaskableIcon: boolean;
    serviceWorkerDetected: boolean;
    warnings?: string[];
    auditedAt?: string;
  };
  submittedAt?: unknown;
  reviewedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminOverviewStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  suspendedCount: number;
  totalSubmissions: number;
}

/**
 * Maps raw Firestore submission document data into a strongly typed AdminSubmissionItem.
 */
function mapDocToAdminSubmission(id: string, d: Record<string, unknown>): AdminSubmissionItem {
  return {
    id,
    developerId: typeof d.developerId === "string" ? d.developerId : "",
    developerName: typeof d.developerName === "string" ? d.developerName : "Independent Developer",
    developerEmail: typeof d.developerEmail === "string" ? d.developerEmail : "",
    developerWebsite: typeof d.developerWebsite === "string" ? d.developerWebsite : undefined,
    title: typeof d.title === "string" ? d.title : "Untitled Application",
    tagline: typeof d.tagline === "string" ? d.tagline : "",
    description: typeof d.description === "string" ? d.description : "",
    appUrl: typeof d.appUrl === "string" ? d.appUrl : typeof d.app_url === "string" ? d.app_url : "",
    manifestUrl: typeof d.manifestUrl === "string" ? d.manifestUrl : undefined,
    iconUrl: typeof d.iconUrl === "string" ? d.iconUrl : "",
    screenshots: Array.isArray(d.screenshots) ? (d.screenshots as string[]) : [],
    primaryCategory:
      typeof d.primaryCategory === "string"
        ? d.primaryCategory
        : Array.isArray(d.categories) && d.categories.length > 0
        ? (d.categories[0] as string)
        : "tools",
    categories: Array.isArray(d.categories) ? (d.categories as string[]) : ["tools"],
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    pricing: typeof d.pricing === "string" ? d.pricing : "free",
    status: (d.status as PwaStatus) || "pending",
    rejectionReason:
      typeof d.rejectionReason === "string"
        ? d.rejectionReason
        : typeof d.reviewNotes === "string"
        ? d.reviewNotes
        : typeof d.reviewerNotes === "string"
        ? d.reviewerNotes
        : undefined,
    automatedAuditResult: d.automatedAuditResult as AdminSubmissionItem["automatedAuditResult"],
    submittedAt: d.submittedAt,
    reviewedAt: d.reviewedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/**
 * Retrieves all pending submissions currently in the moderation review queue.
 */
export async function getPendingSubmissions(): Promise<AdminSubmissionItem[]> {
  try {
    const subsRef = collection(db, "submissions");
    const q = query(subsRef, where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);

    const items: AdminSubmissionItem[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push(mapDocToAdminSubmission(docSnap.id, docSnap.data()));
    });

    return items;
  } catch (error) {
    console.error("Error fetching pending submissions in admin service:", error);
    return [];
  }
}

/**
 * Retrieves submissions filtered by status or all submissions for the review queue.
 */
export async function getAdminSubmissions(
  statusFilter: string = "all"
): Promise<AdminSubmissionItem[]> {
  try {
    const subsRef = collection(db, "submissions");
    let querySnapshot;

    if (statusFilter && statusFilter !== "all") {
      const q = query(subsRef, where("status", "==", statusFilter));
      querySnapshot = await getDocs(q);
    } else {
      querySnapshot = await getDocs(subsRef);
    }

    const items: AdminSubmissionItem[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push(mapDocToAdminSubmission(docSnap.id, docSnap.data()));
    });

    return items;
  } catch (error) {
    console.error("Error fetching admin submissions:", error);
    return [];
  }
}

/**
 * Retrieves a single submission document by its ID for inspector view.
 */
export async function getSubmissionById(
  submissionId: string
): Promise<AdminSubmissionItem | null> {
  if (!submissionId) return null;

  try {
    const docRef = doc(db, "submissions", submissionId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    return mapDocToAdminSubmission(snap.id, snap.data());
  } catch (error) {
    console.error(`Error fetching submission "${submissionId}":`, error);
    return null;
  }
}

/**
 * Computes live administrative metrics across submissions and live PWAs.
 */
export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  try {
    const [subsSnap, pwasSnap] = await Promise.all([
      getDocs(collection(db, "submissions")),
      getDocs(collection(db, "pwas")),
    ]);

    let pendingCount = 0;
    let rejectedCount = 0;
    let approvedFromSubs = 0;

    subsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === "pending") pendingCount++;
      else if (data.status === "rejected") rejectedCount++;
      else if (data.status === "approved") approvedFromSubs++;
    });

    let approvedCount = pwasSnap.size;
    let suspendedCount = 0;

    pwasSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === "suspended") {
        suspendedCount++;
      }
    });

    // If pwas collection has approved docs, use that; otherwise fallback to subs
    if (approvedCount === 0 && approvedFromSubs > 0) {
      approvedCount = approvedFromSubs;
    }

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      suspendedCount,
      totalSubmissions: subsSnap.size,
    };
  } catch (error) {
    console.error("Error computing admin overview stats:", error);
    return {
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      suspendedCount: 0,
      totalSubmissions: 0,
    };
  }
}

/**
 * Client helper to dispatch an approval or rejection action to POST /api/admin/review-action.
 */
export async function executeReviewAction(params: {
  submissionId: string;
  action: "approve" | "reject";
  reason?: string;
  idToken: string;
}): Promise<{ ok: boolean; slug?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/review-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({
        submissionId: params.submissionId,
        action: params.action,
        reason: params.reason,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Review decision failed." };
    }

    return { ok: true, slug: data.slug };
  } catch (err) {
    console.error("Network error executing review action:", err);
    return { ok: false, error: "Network connection failed while submitting review decision." };
  }
}


