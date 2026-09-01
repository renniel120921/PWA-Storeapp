import type { TimestampValue } from "./auth.types";

/**
 * Exact allowed lifecycle status states for any PWA or submission.
 */
export type PwaStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

/**
 * PWA monetization and pricing tier.
 */
export type PwaPricing = "free" | "freemium" | "paid";

/**
 * Automated PWA verification audit report payload.
 */
export interface AutomatedAuditResult {
  hasHttps: boolean;
  hasValidManifest: boolean;
  manifestScore?: number;
  displayMode?: string;
  themeColor?: string;
  backgroundColor?: string;
  iconsFound?: { src: string; sizes: string }[];
  checkedAt?: TimestampValue;
}

/**
 * Master listed PWA document in Cloud Firestore (`pwas/{slug}`).
 */
export interface Pwa {
  id: string;
  slug: string;
  developerId: string;
  developerName: string;
  developerEmail?: string;
  developerWebsite?: string;
  title: string;
  tagline: string;
  description: string;
  appUrl: string;
  /** Legacy field alias for backwards compatibility with initial seed data */
  app_url?: string;
  manifestUrl?: string;
  iconUrl: string;
  screenshots: string[];
  primaryCategory: string;
  categories: string[];
  tags: string[];
  pricing: PwaPricing;
  status: PwaStatus;
  isFeatured: boolean;
  viewsCount: number;
  clicksCount: number;
  ratingAverage: number;
  ratingCount: number;
  submittedAt: TimestampValue;
  approvedAt?: TimestampValue;
  updatedAt: TimestampValue;
}

/**
 * Proposed PWA draft data fields used inside submissions.
 */
export interface PwaDraftData {
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
  pricing: PwaPricing;
}

/**
 * Review queue submission document in Cloud Firestore (`submissions/{subId}`).
 */
export interface PwaSubmission {
  id: string;
  pwaId?: string;
  developerId: string;
  developerEmail: string;
  draftData: Partial<PwaDraftData>;
  status: PwaStatus;
  rejectionReason?: string;
  reviewerId?: string;
  reviewerNotes?: string;
  automatedAudit?: AutomatedAuditResult;
  submittedAt?: TimestampValue;
  reviewedAt?: TimestampValue;
  createdAt: TimestampValue;
}

/**
 * Directory taxonomy category.
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  displayOrder: number;
  appCount: number;
}

/**
 * User star rating and review (`reviews/{userId}_{pwaId}`).
 */
export interface Review {
  id: string;
  pwaId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  comment: string;
  status: "published" | "hidden";
  createdAt: TimestampValue;
  updatedAt?: TimestampValue;
}

/**
 * User bookmark / favorite (`favorites/{userId}_{pwaId}`).
 */
export interface Favorite {
  id: string;
  userId: string;
  pwaId: string;
  createdAt: TimestampValue;
}

/**
 * Reason categories for community app reporting.
 */
export type ReportReason =
  | "broken_link"
  | "not_pwa"
  | "malicious"
  | "copyright"
  | "spam"
  | "other";

/**
 * Community moderation report (`appReports/{reportId}`).
 */
export interface AppReport {
  id: string;
  pwaId: string;
  reporterEmail?: string;
  reason: ReportReason;
  details: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  resolvedBy?: string;
  createdAt: TimestampValue;
}

