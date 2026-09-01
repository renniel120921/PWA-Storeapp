import { z } from "zod";

/**
 * Strict HTTPS App URL Schema.
 * Prevents non-HTTPS URLs, javascript: injection, data: URIs, blob: URIs, etc.
 */
export const AppUrlSchema = z
  .string()
  .trim()
  .url("Please enter a valid URL (e.g., https://myapp.com)")
  .refine(
    (url) => url.startsWith("https://"),
    "App URL must be served securely over HTTPS (https://)"
  )
  .refine(
    (url) => !/^https:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/i.test(url),
    "Private IP and localhost URLs are not allowed"
  );

/**
 * Safe Image/Asset URL Schema (Logo & Screenshots).
 */
export const AssetUrlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .refine(
    (url) => url.startsWith("https://") || url.startsWith("/"),
    "Asset URL must be a secure HTTPS URL or valid path"
  );

/**
 * PWA Draft Schema - relaxed validation for saving incomplete drafts.
 */
export const PwaDraftSchema = z.object({
  title: z.string().trim().max(50, "Title cannot exceed 50 characters").optional().default(""),
  tagline: z.string().trim().max(120, "Tagline cannot exceed 120 characters").optional().default(""),
  description: z.string().trim().max(5000, "Description cannot exceed 5000 characters").optional().default(""),
  appUrl: z.string().trim().optional().default(""),
  manifestUrl: z.string().trim().optional(),
  iconUrl: z.string().trim().optional().default(""),
  screenshots: z.array(z.string().trim()).max(5, "Maximum 5 screenshots allowed").optional().default([]),
  primaryCategory: z.string().trim().optional().default("tools"),
  categories: z.array(z.string().trim()).optional().default([]),
  tags: z.array(z.string().trim().max(20)).max(5, "Maximum 5 tags allowed").optional().default([]),
  pricing: z.enum(["free", "freemium", "paid"]).default("free"),
});

export type PwaDraftInput = z.infer<typeof PwaDraftSchema>;

/**
 * Full PWA Submission Schema - strict validation before entering pending review.
 */
export const PwaSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters long")
    .max(50, "Title cannot exceed 50 characters"),
  tagline: z
    .string()
    .trim()
    .min(10, "Tagline must be at least 10 characters long")
    .max(120, "Tagline cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .min(30, "Please provide a description of at least 30 characters")
    .max(5000, "Description cannot exceed 5000 characters"),
  appUrl: AppUrlSchema,
  manifestUrl: z
    .string()
    .trim()
    .url("Invalid manifest URL")
    .refine((url) => url.startsWith("https://"), "Manifest must be served over HTTPS")
    .optional()
    .or(z.literal("")),
  iconUrl: AssetUrlSchema,
  screenshots: z
    .array(AssetUrlSchema)
    .min(1, "Please provide at least 1 screenshot of your application")
    .max(5, "You can upload up to 5 screenshots"),
  primaryCategory: z.string().trim().min(1, "Please select a primary category"),
  categories: z
    .array(z.string().trim().min(1))
    .min(1, "Please select at least one category"),
  tags: z
    .array(z.string().trim().min(1).max(20, "Tag must be 20 characters or less"))
    .max(5, "Maximum of 5 tags allowed")
    .default([]),
  pricing: z.enum(["free", "freemium", "paid"]).default("free"),
});

export type PwaSubmissionInput = z.infer<typeof PwaSubmissionSchema>;

/**
 * Review / Rating Schema (Phase 2).
 */
export const ReviewSchema = z.object({
  pwaId: z.string().min(1, "Target PWA is required"),
  rating: z.number().int().min(1, "Minimum rating is 1").max(5, "Maximum rating is 5"),
  comment: z
    .string()
    .trim()
    .min(5, "Review comment must be at least 5 characters")
    .max(1000, "Review comment cannot exceed 1000 characters"),
});

export type ReviewInput = z.infer<typeof ReviewSchema>;

/**
 * Community App Moderation Report Schema.
 */
export const AppReportSchema = z.object({
  pwaId: z.string().min(1, "Target PWA is required"),
  reporterEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  reason: z.enum(["broken_link", "not_pwa", "malicious", "copyright", "spam", "other"]),
  details: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters explaining the issue")
    .max(500, "Details cannot exceed 500 characters"),
});

export type AppReportInput = z.infer<typeof AppReportSchema>;

