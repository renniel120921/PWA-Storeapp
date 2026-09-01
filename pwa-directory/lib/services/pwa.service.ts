import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  deleteDoc,
} from "firebase/firestore";
import type { Pwa } from "@/types";

/**
 * Normalizes a raw Firestore document snapshot data into a type-safe Pwa object.
 */
function mapDocToPwa(docId: string, data: Record<string, unknown>): Pwa {
  const categories = Array.isArray(data.categories) ? (data.categories as string[]) : [];
  const primaryCat =
    typeof data.primaryCategory === "string" && data.primaryCategory
      ? data.primaryCategory
      : categories.length > 0
      ? categories[0]
      : "tools";

  const appUrlString =
    typeof data.appUrl === "string"
      ? data.appUrl
      : typeof data.app_url === "string"
      ? data.app_url
      : "";

  return {
    id: docId,
    slug: typeof data.slug === "string" ? data.slug : docId,
    developerId: typeof data.developerId === "string" ? data.developerId : "",
    developerName:
      typeof data.developerName === "string"
        ? data.developerName
        : "Independent Developer",
    developerEmail:
      typeof data.developerEmail === "string" ? data.developerEmail : undefined,
    developerWebsite:
      typeof data.developerWebsite === "string"
        ? data.developerWebsite
        : undefined,
    title: typeof data.title === "string" ? data.title : "Untitled App",
    tagline: typeof data.tagline === "string" ? data.tagline : "",
    description:
      typeof data.description === "string" ? data.description : "",
    appUrl: appUrlString,
    app_url: appUrlString,
    manifestUrl:
      typeof data.manifestUrl === "string" ? data.manifestUrl : undefined,
    iconUrl: typeof data.iconUrl === "string" ? data.iconUrl : "",
    screenshots: Array.isArray(data.screenshots)
      ? (data.screenshots as string[])
      : [],
    primaryCategory: primaryCat,
    categories: categories,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    pricing:
      data.pricing === "freemium" || data.pricing === "paid"
        ? data.pricing
        : "free",
    status:
      data.status === "draft" ||
      data.status === "pending" ||
      data.status === "rejected" ||
      data.status === "suspended"
        ? data.status
        : "approved",
    isFeatured: Boolean(data.isFeatured),
    viewsCount: typeof data.viewsCount === "number" ? data.viewsCount : 0,
    clicksCount: typeof data.clicksCount === "number" ? data.clicksCount : 0,
    ratingAverage:
      typeof data.ratingAverage === "number" ? data.ratingAverage : 0,
    ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : 0,
    submittedAt: (data.submittedAt as Pwa["submittedAt"]) || null,
    approvedAt: (data.approvedAt as Pwa["approvedAt"]) || null,
    updatedAt: (data.updatedAt as Pwa["updatedAt"]) || null,
  };
}

/**
 * Retrieves approved PWAs for the public directory.
 * Strictly queries documents where status == "approved".
 */
export async function getApprovedPwas(limitCount: number = 50): Promise<Pwa[]> {
  try {
    const pwasRef = collection(db, "pwas");
    const approvedQuery = query(
      pwasRef,
      where("status", "==", "approved"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(approvedQuery);

    const pwas: Pwa[] = [];
    querySnapshot.forEach((docSnap) => {
      pwas.push(mapDocToPwa(docSnap.id, docSnap.data()));
    });

    return pwas;
  } catch (error) {
    console.error("Error in getApprovedPwas service:", error);
    return [];
  }
}

/**
 * Retrieves a single approved PWA by its unique slug/ID for the public detail view.
 * Ensures that non-approved listings are not exposed to the public.
 */
export async function getPwaBySlug(slug: string): Promise<Pwa | null> {
  if (!slug) return null;

  try {
    // 1. Direct document lookup by ID/slug with safe permission handling
    try {
      const docRef = doc(db, "pwas", slug);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const pwa = mapDocToPwa(docSnap.id, docSnap.data());
        if (pwa.status === "approved") {
          return pwa;
        }
      }
    } catch {
      // Direct getDoc will trigger a permission error if the document is not approved under firestore.rules
      // Ignore and proceed to query lookup
    }

    // 2. Query lookup by 'slug' field strictly constrained to status == "approved"
    const pwasRef = collection(db, "pwas");
    const q = query(
      pwasRef,
      where("slug", "==", slug),
      where("status", "==", "approved"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const firstDoc = querySnapshot.docs[0];
      return mapDocToPwa(firstDoc.id, firstDoc.data());
    }

    return null;
  } catch (error) {
    console.error(`Error in getPwaBySlug service for "${slug}":`, error);
    return null;
  }
}

/**
 * Retrieves approved PWAs filtered by category for directory browsing.
 */
export async function getPwasByCategory(
  category: string,
  limitCount: number = 50
): Promise<Pwa[]> {
  try {
    if (!category || category === "all") {
      return getApprovedPwas(limitCount);
    }

    const pwasRef = collection(db, "pwas");
    const q = query(
      pwasRef,
      where("status", "==", "approved"),
      where("categories", "array-contains", category.toLowerCase()),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const pwas: Pwa[] = [];
    querySnapshot.forEach((docSnap) => {
      pwas.push(mapDocToPwa(docSnap.id, docSnap.data()));
    });

    return pwas;
  } catch (error) {
    console.error(`Error in getPwasByCategory service for "${category}":`, error);
    return [];
  }
}

/**
 * Interface representing a developer's application item in the dashboard.
 */
export interface DeveloperAppItem {
  id: string;
  slug?: string;
  submissionId?: string;
  title: string;
  tagline: string;
  description: string;
  appUrl: string;
  iconUrl: string;
  screenshots: string[];
  primaryCategory: string;
  categories: string[];
  tags: string[];
  pricing: string;
  status: "draft" | "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  submittedAt?: unknown;
  approvedAt?: unknown;
  unlistedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  isLivePwa?: boolean;
}

/**
 * Retrieves all submissions created by a specific developer.
 * Scoped strictly to developerId == request.auth.uid.
 */
export async function getDeveloperSubmissions(
  developerId: string
): Promise<DeveloperAppItem[]> {
  if (!developerId) return [];

  try {
    const subsRef = collection(db, "submissions");
    const q = query(subsRef, where("developerId", "==", developerId));
    const querySnapshot = await getDocs(q);

    const items: DeveloperAppItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      items.push({
        id: docSnap.id,
        slug: typeof d.slug === "string" ? d.slug : undefined,
        submissionId: docSnap.id,
        title: d.title || "Untitled App",
        tagline: d.tagline || "",
        description: d.description || "",
        appUrl: d.appUrl || d.app_url || "",
        iconUrl: d.iconUrl || "",
        screenshots: Array.isArray(d.screenshots) ? d.screenshots : [],
        primaryCategory: d.primaryCategory || (Array.isArray(d.categories) && d.categories[0]) || "tools",
        categories: Array.isArray(d.categories) ? d.categories : ["tools"],
        tags: Array.isArray(d.tags) ? d.tags : [],
        pricing: d.pricing || "free",
        status: d.status || "draft",
        rejectionReason: d.rejectionReason || d.reviewNotes || d.reviewerNotes,
        submittedAt: d.submittedAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        isLivePwa: false,
      });
    });

    return items;
  } catch (error) {
    console.error("Error fetching developer submissions:", error);
    return [];
  }
}

/**
 * Retrieves all master live listings created by a specific developer.
 * Scoped strictly to developerId == request.auth.uid.
 */
export async function getDeveloperListings(
  developerId: string
): Promise<DeveloperAppItem[]> {
  if (!developerId) return [];

  try {
    const pwasRef = collection(db, "pwas");
    const q = query(pwasRef, where("developerId", "==", developerId));
    const querySnapshot = await getDocs(q);

    const items: DeveloperAppItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      items.push({
        id: docSnap.id,
        slug: d.slug || docSnap.id,
        submissionId: typeof d.submissionId === "string" ? d.submissionId : undefined,
        title: d.title || "Untitled App",
        tagline: d.tagline || "",
        description: d.description || "",
        appUrl: d.appUrl || d.app_url || "",
        iconUrl: d.iconUrl || "",
        screenshots: Array.isArray(d.screenshots) ? d.screenshots : [],
        primaryCategory: d.primaryCategory || (Array.isArray(d.categories) && d.categories[0]) || "tools",
        categories: Array.isArray(d.categories) ? d.categories : ["tools"],
        tags: Array.isArray(d.tags) ? d.tags : [],
        pricing: d.pricing || "free",
        status: d.status || "approved",
        submittedAt: d.submittedAt,
        approvedAt: d.approvedAt,
        unlistedAt: d.unlistedAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        isLivePwa: d.status === "approved",
      });
    });

    return items;
  } catch (error) {
    console.error("Error fetching developer listings:", error);
    return [];
  }
}

/**
 * Aggregates all developer apps with single-source-of-truth deduplication.
 * Canonical rule:
 * - 'pwas' collection holds live/suspended listings
 * - 'submissions' collection holds draft, pending, or rejected records
 * - An approved app appears exactly ONCE (using the canonical PWA document)
 */
export async function getDeveloperDashboardApps(
  developerId: string
): Promise<DeveloperAppItem[]> {
  if (!developerId) return [];

  try {
    const [submissions, liveListings] = await Promise.all([
      getDeveloperSubmissions(developerId),
      getDeveloperListings(developerId),
    ]);

    // Build lookup set of already represented / approved apps from live listings
    const liveSubmissionIds = new Set<string>();
    const liveSlugs = new Set<string>();

    liveListings.forEach((pwa) => {
      if (pwa.submissionId) liveSubmissionIds.add(pwa.submissionId);
      if (pwa.slug) liveSlugs.add(pwa.slug);
      liveSlugs.add(pwa.id);
    });

    // Submissions that are draft, pending, or rejected, and not already covered by a live PWA listing
    const nonDuplicatedSubmissions = submissions.filter((sub) => {
      if (liveSubmissionIds.has(sub.id)) return false;
      if (sub.slug && liveSlugs.has(sub.slug)) return false;
      if (sub.status === "approved") return false; // Approved apps are canonically represented by the PWA doc
      return true;
    });

    const combined = [...liveListings, ...nonDuplicatedSubmissions];

    // Sort by timestamp (newest first)
    combined.sort((a, b) => {
      const getEpoch = (val: unknown) => {
        if (!val) return 0;
        if (typeof val === "object" && val !== null && "seconds" in val) {
          return (val as { seconds: number }).seconds * 1000;
        }
        if (val instanceof Date) return val.getTime();
        return 0;
      };
      const timeA = getEpoch(a.updatedAt || a.approvedAt || a.submittedAt || a.createdAt);
      const timeB = getEpoch(b.updatedAt || b.approvedAt || b.submittedAt || b.createdAt);
      return timeB - timeA;
    });

    return combined;
  } catch (err) {
    console.error("Error aggregating developer dashboard apps:", err);
    return [];
  }
}

/**
 * Safely deletes a developer's draft submission.
 */
export async function deleteDraftSubmission(
  submissionId: string,
  developerId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!submissionId || !developerId) {
    return { ok: false, error: "Invalid submission ID or user session." };
  }

  try {
    const docRef = doc(db, "submissions", submissionId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { ok: false, error: "Submission not found." };
    }

    const data = snap.data();
    if (data.developerId !== developerId) {
      return { ok: false, error: "Unauthorized: You do not own this submission." };
    }

    if (data.status !== "draft") {
      return { ok: false, error: "Only draft submissions can be deleted." };
    }

    await deleteDoc(docRef);
    return { ok: true };
  } catch (error) {
    console.error("Error deleting draft submission:", error);
    return { ok: false, error: "Could not delete draft submission." };
  }
}

/**
 * Safely cancels a developer's pending submission.
 */
export async function cancelPendingSubmission(
  submissionId: string,
  developerId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!submissionId || !developerId) {
    return { ok: false, error: "Invalid submission ID or user session." };
  }

  try {
    const docRef = doc(db, "submissions", submissionId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { ok: false, error: "Submission not found." };
    }

    const data = snap.data();
    if (data.developerId !== developerId) {
      return { ok: false, error: "Unauthorized: You do not own this submission." };
    }

    if (data.status !== "pending") {
      return { ok: false, error: "Only pending submissions can be cancelled." };
    }

    await deleteDoc(docRef);
    return { ok: true };
  } catch (error) {
    console.error("Error cancelling pending submission:", error);
    return { ok: false, error: "Could not cancel submission." };
  }
}

/**
 * Client helper to unpublish/remove an approved PWA listing.
 */
export async function removeApprovedPwaListing(params: {
  slug: string;
  idToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/pwa/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({ slug: params.slug }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Failed to remove listing." };
    }

    return { ok: true };
  } catch (err) {
    console.error("Network error removing listing:", err);
    return {
      ok: false,
      error: "Network connection failed while removing listing.",
    };
  }
}
