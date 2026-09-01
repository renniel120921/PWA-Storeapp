"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/submission/StepIndicator";
import { ManifestUrlInput } from "@/components/submission/ManifestUrlInput";
import { PwaAuditReport } from "@/components/review/PwaAuditReport";
import { PwaPreviewCard } from "@/components/submission/PwaPreviewCard";
import { DIRECTORY_CATEGORIES } from "@/lib/constants/categories";
import { PwaSubmissionSchema } from "@/lib/validators/pwa.validator";
import type { PwaVerificationResult } from "@/lib/services/pwa-verifier.service";

const WIZARD_STEPS = [
  { id: 1, label: "App URL" },
  { id: 2, label: "PWA Audit" },
  { id: 3, label: "App Details" },
  { id: 4, label: "Branding" },
  { id: 5, label: "Review & Submit" },
];

export default function SubmitPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<PwaVerificationResult | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    appUrl: "",
    manifestUrl: "",
    title: "",
    tagline: "",
    description: "",
    primaryCategory: "tools",
    categories: ["tools"],
    tags: [] as string[],
    tagInput: "",
    pricing: "free" as "free" | "freemium" | "paid",
    iconUrl: "",
    screenshots: [] as string[],
    screenshotInput: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Step 1: Verification Call
  // ---------------------------------------------------------------------------
  const handleVerifyUrl = async (targetUrl: string) => {
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/pwa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data: PwaVerificationResult = await res.json();

      if (!res.ok || !data.checks?.https) {
        setVerifyError(
          data.errors?.[0] || "Could not verify target PWA. Please ensure the URL is accessible over HTTPS."
        );
        setIsVerifying(false);
        return;
      }

      setAuditReport(data);

      // Pre-populate fields from detected manifest data (without overwriting manual edits)
      setFormData((prev) => {
        const manifest = data.manifest;
        let detectedIcon = prev.iconUrl;
        if (!detectedIcon && manifest?.icons && manifest.icons.length > 0) {
          const icon512 = manifest.icons.find((i) => i.sizes?.includes("512x512"));
          const icon192 = manifest.icons.find((i) => i.sizes?.includes("192x192"));
          detectedIcon = (icon512 || icon192 || manifest.icons[0]).src;
        }

        return {
          ...prev,
          appUrl: data.finalUrl || targetUrl,
          manifestUrl: data.manifest ? data.finalUrl : prev.manifestUrl,
          title: prev.title || manifest?.name || manifest?.shortName || "",
          tagline: prev.tagline || (manifest?.description ? manifest.description.slice(0, 100) : ""),
          description: prev.description || manifest?.description || "",
          iconUrl: detectedIcon,
        };
      });

      setCurrentStep(2);
    } catch {
      setVerifyError("Network error while communicating with verification server.");
    } finally {
      setIsVerifying(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 3 Validation: App Info
  // ---------------------------------------------------------------------------
  const handleValidateStep3 = () => {
    const errors: Record<string, string> = {};

    if (!formData.title || formData.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters.";
    } else if (formData.title.trim().length > 50) {
      errors.title = "Title cannot exceed 50 characters.";
    }

    if (!formData.tagline || formData.tagline.trim().length < 10) {
      errors.tagline = "Tagline must be at least 10 characters.";
    } else if (formData.tagline.trim().length > 120) {
      errors.tagline = "Tagline cannot exceed 120 characters.";
    }

    if (!formData.description || formData.description.trim().length < 30) {
      errors.description = "Description must be at least 30 characters.";
    } else if (formData.description.trim().length > 5000) {
      errors.description = "Description cannot exceed 5000 characters.";
    }

    if (!formData.primaryCategory) {
      errors.primaryCategory = "Please select a primary category.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCurrentStep(4);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 4 Validation: Branding & Screenshots
  // ---------------------------------------------------------------------------
  const handleValidateStep4 = () => {
    const errors: Record<string, string> = {};

    if (!formData.iconUrl || !formData.iconUrl.trim()) {
      errors.iconUrl = "Please provide an icon/logo URL for your application.";
    } else if (!formData.iconUrl.startsWith("https://") && !formData.iconUrl.startsWith("/")) {
      errors.iconUrl = "Icon URL must be a valid HTTPS address.";
    }

    if (!formData.screenshots || formData.screenshots.length === 0) {
      errors.screenshots = "Please add at least 1 screenshot of your application.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCurrentStep(5);
    }
  };

  // ---------------------------------------------------------------------------
  // Tags Helper
  // ---------------------------------------------------------------------------
  const handleAddTag = () => {
    const tag = formData.tagInput.trim().toLowerCase().replace(/^#/, "");
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
        tagInput: "",
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  // ---------------------------------------------------------------------------
  // Screenshots Helper
  // ---------------------------------------------------------------------------
  const handleAddScreenshot = () => {
    const url = formData.screenshotInput.trim();
    if (url && (url.startsWith("https://") || url.startsWith("/")) && formData.screenshots.length < 5) {
      setFormData((prev) => ({
        ...prev,
        screenshots: [...prev.screenshots, url],
        screenshotInput: "",
      }));
      setFieldErrors((prev) => ({ ...prev, screenshots: "" }));
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index),
    }));
  };

  // ---------------------------------------------------------------------------
  // Step 6: Final Submission via Server Route
  // ---------------------------------------------------------------------------
  const handleSubmitForReview = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);

    // Full Zod validation before submitting
    const payload = {
      title: formData.title,
      tagline: formData.tagline,
      description: formData.description,
      appUrl: formData.appUrl,
      manifestUrl: formData.manifestUrl || undefined,
      iconUrl: formData.iconUrl,
      screenshots: formData.screenshots,
      primaryCategory: formData.primaryCategory,
      categories: [formData.primaryCategory],
      tags: formData.tags,
      pricing: formData.pricing,
    };

    const parsed = PwaSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message || "Validation failed.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Create client-side draft in submissions collection
      const submissionRef = doc(collection(db, "submissions"));
      const submissionId = submissionRef.id;

      await setDoc(submissionRef, {
        id: submissionId,
        developerId: user.uid,
        developerEmail: user.email || "",
        developerName: profile?.fullName || user.displayName || "Developer",
        developerWebsite: profile?.website || "",
        ...payload,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Obtain Firebase ID Token
      const idToken = await user.getIdToken();

      // 3. Call Server API to promote draft -> pending
      const res = await fetch("/api/pwa/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ submissionId }),
      });

      const result = await res.json();

      if (!res.ok || !result.ok) {
        setSubmitError(result.error || "Server rejected submission promotion.");
        setIsSubmitting(false);
        return;
      }

      setSubmittedId(submissionId);
      setCurrentStep(6);
    } catch {
      setSubmitError("Failed to submit application. Please check your network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Unauthenticated Guard Screen
  // ---------------------------------------------------------------------------
  if (!authLoading && !isAuthenticated) {
    return (
      <div
        className="min-h-screen bg-(--paper) text-(--ink) flex flex-col justify-center items-center px-6 py-20"
        style={
          {
            "--paper": "#F6F4EC",
            "--card": "#FFFFFF",
            "--ink": "#122A2C",
            "--ink-soft": "#EEEAD9",
            "--body": "#4C5652",
            "--body-dim": "#7A8480",
            "--line": "#DBD5C3",
            "--coral": "#FF6A4D",
          } as React.CSSProperties
        }
      >
        <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-(--ink)/5 flex items-center justify-center mb-6">
            <Lock className="w-6 h-6 text-(--body)" />
          </div>

          <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-2">
            developer authentication required
          </span>

          <h1 className="font-display text-3xl font-medium text-(--ink) tracking-tight mb-3">
            Submit your PWA
          </h1>

          <p className="text-sm text-(--body) leading-relaxed mb-8">
            Please log in or create a developer account to submit your progressive web app to the Likha catalog.
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/login">
              <Button className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm">
                Log in to continue
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                variant="outline"
                className="w-full h-11 border-(--line) text-(--ink) bg-transparent hover:bg-(--ink-soft) font-medium text-sm"
              >
                Create developer account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Success Screen (Step 6)
  // ---------------------------------------------------------------------------
  if (currentStep === 6) {
    return (
      <div
        className="min-h-screen bg-(--paper) text-(--ink) py-16 px-6"
        style={
          {
            "--paper": "#F6F4EC",
            "--card": "#FFFFFF",
            "--ink": "#122A2C",
            "--ink-soft": "#EEEAD9",
            "--body": "#4C5652",
            "--body-dim": "#7A8480",
            "--line": "#DBD5C3",
            "--coral": "#FF6A4D",
          } as React.CSSProperties
        }
      >
        <div className="max-w-xl mx-auto bg-(--card) rounded-xl border border-(--line) p-8 sm:p-10 shadow-[5px_5px_0_0_var(--line)] text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              status: pending review
            </span>
            <h1 className="font-display text-3xl font-medium text-(--ink) tracking-tight mt-4 mb-2">
              Submission Sent for Review!
            </h1>
            <p className="text-sm text-(--body) leading-relaxed">
              Your app <strong>{formData.title}</strong> has been submitted. Our team will review the listing against marketplace standards before publishing it to the public directory.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-(--paper) border border-(--line) text-left text-xs space-y-2 font-mono text-(--body)">
            <div><strong>Submission ID:</strong> {submittedId}</div>
            <div><strong>App URL:</strong> {formData.appUrl}</div>
            <div><strong>Category:</strong> {formData.primaryCategory}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => router.push("/")}
              className="flex-1 h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm"
            >
              Back to directory
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFormData({
                  appUrl: "",
                  manifestUrl: "",
                  title: "",
                  tagline: "",
                  description: "",
                  primaryCategory: "tools",
                  categories: ["tools"],
                  tags: [],
                  tagInput: "",
                  pricing: "free",
                  iconUrl: "",
                  screenshots: [],
                  screenshotInput: "",
                });
                setAuditReport(null);
                setCurrentStep(1);
              }}
              className="flex-1 h-11 border-(--line) text-(--ink) bg-transparent hover:bg-(--ink-soft) font-medium text-sm"
            >
              Submit another app
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main Interactive Wizard Screen
  // ---------------------------------------------------------------------------
  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink) py-12 px-6"
      style={
        {
          "--paper": "#F6F4EC",
          "--card": "#FFFFFF",
          "--ink": "#122A2C",
          "--ink-soft": "#EEEAD9",
          "--body": "#4C5652",
          "--body-dim": "#7A8480",
          "--line": "#DBD5C3",
          "--coral": "#FF6A4D",
          "--gold": "#A9791F",
        } as React.CSSProperties
      }
    >
      <div className="max-w-3xl mx-auto">
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-(--body) hover:text-(--ink) transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Cancel and return</span>
          </Link>

          <span className="font-mono text-xs text-(--body-dim)">
            {profile?.fullName || user?.displayName || user?.email}
          </span>
        </div>

        {/* Wizard Card Container */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-7 sm:p-10 shadow-[5px_5px_0_0_var(--line)]">
          {/* Step Progress Bar */}
          <StepIndicator
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            onStepClick={(step) => setCurrentStep(step)}
          />

          {/* --------------------------------------------------------------- */}
          {/* STEP 1: URL INPUT */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight mb-2">
                  Enter your PWA address
                </h2>
                <p className="text-sm text-(--body) leading-relaxed">
                  Provide your production web application URL. Our automated engine will inspect your web app manifest and icons.
                </p>
              </div>

              <ManifestUrlInput
                initialUrl={formData.appUrl}
                onVerify={handleVerifyUrl}
                isVerifying={isVerifying}
                error={verifyError}
              />
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 2: PWA AUDIT SUMMARY */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 2 && auditReport && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight mb-2">
                  Live PWA Audit Results
                </h2>
                <p className="text-sm text-(--body) leading-relaxed">
                  Review the automated inspection findings. We have extracted your app metadata to pre-populate the next steps.
                </p>
              </div>

              <PwaAuditReport
                report={auditReport}
                onProceed={() => setCurrentStep(3)}
                onReverify={() => setCurrentStep(1)}
              />
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 3: APP INFORMATION */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight mb-2">
                  App Information
                </h2>
                <p className="text-sm text-(--body) leading-relaxed">
                  Refine your listing details. Detected values have been pre-filled from your manifest.
                </p>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label htmlFor="pwa-title" className="block font-mono text-xs uppercase text-(--body)">
                    App Name <span className="text-(--coral)">*</span>
                  </label>
                  <input
                    id="pwa-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. SmartBasura"
                    className="w-full h-11 px-3.5 rounded-md border border-(--line) bg-(--card) text-sm outline-none focus:border-(--ink) focus:ring-1 focus:ring-(--ink)"
                  />
                  {fieldErrors.title && (
                    <p className="text-xs text-red-600">{fieldErrors.title}</p>
                  )}
                </div>

                {/* Tagline */}
                <div className="space-y-1.5">
                  <label htmlFor="pwa-tagline" className="block font-mono text-xs uppercase text-(--body)">
                    Tagline (Short Summary) <span className="text-(--coral)">*</span>
                  </label>
                  <input
                    id="pwa-tagline"
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g. Household waste pickup reminders and sorting guide."
                    className="w-full h-11 px-3.5 rounded-md border border-(--line) bg-(--card) text-sm outline-none focus:border-(--ink) focus:ring-1 focus:ring-(--ink)"
                  />
                  {fieldErrors.tagline && (
                    <p className="text-xs text-red-600">{fieldErrors.tagline}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label htmlFor="pwa-desc" className="block font-mono text-xs uppercase text-(--body)">
                    Full Description <span className="text-(--coral)">*</span>
                  </label>
                  <textarea
                    id="pwa-desc"
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide details about your web app, core features, and use cases..."
                    className="w-full p-3.5 rounded-md border border-(--line) bg-(--card) text-sm outline-none focus:border-(--ink) focus:ring-1 focus:ring-(--ink) resize-y"
                  />
                  {fieldErrors.description && (
                    <p className="text-xs text-red-600">{fieldErrors.description}</p>
                  )}
                </div>

                {/* Category & Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="pwa-cat" className="block font-mono text-xs uppercase text-(--body)">
                      Primary Category <span className="text-(--coral)">*</span>
                    </label>
                    <select
                      id="pwa-cat"
                      value={formData.primaryCategory}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          primaryCategory: e.target.value,
                          categories: [e.target.value],
                        })
                      }
                      className="w-full h-11 px-3.5 rounded-md border border-(--line) bg-(--card) text-sm outline-none focus:border-(--ink) cursor-pointer capitalize"
                    >
                      {DIRECTORY_CATEGORIES.filter((c) => c.slug !== "all").map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="pwa-pricing" className="block font-mono text-xs uppercase text-(--body)">
                      Pricing Model
                    </label>
                    <select
                      id="pwa-pricing"
                      value={formData.pricing}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricing: e.target.value as "free" | "freemium" | "paid",
                        })
                      }
                      className="w-full h-11 px-3.5 rounded-md border border-(--line) bg-(--card) text-sm outline-none focus:border-(--ink) cursor-pointer capitalize"
                    >
                      <option value="free">Free</option>
                      <option value="freemium">Freemium</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs uppercase text-(--body)">
                    Tags (Up to 5)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.tagInput}
                      onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="e.g. utility, recycling, productivity"
                      className="flex-1 h-11 px-3.5 rounded-md border border-(--line) bg-(--card) text-sm outline-none focus:border-(--ink)"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                      disabled={formData.tags.length >= 5 || !formData.tagInput.trim()}
                      className="h-11 px-4 border-(--line) text-(--ink)"
                    >
                      Add
                    </Button>
                  </div>

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-xs bg-(--ink-soft) text-(--ink) px-2.5 py-1 rounded-md flex items-center gap-1.5"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3 Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-(--line)">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="h-11 px-5 border-(--line) text-(--body) hover:text-(--ink)"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleValidateStep3}
                  className="h-11 px-6 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm flex items-center gap-2"
                >
                  <span>Next: Branding</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 4: BRANDING & SCREENSHOTS */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight mb-2">
                  Branding & Visuals
                </h2>
                <p className="text-sm text-(--body) leading-relaxed">
                  Provide your application logo icon and screenshot previews for the catalog showcase.
                </p>
              </div>

              <div className="space-y-6">
                {/* Icon URL */}
                <div className="space-y-2">
                  <label htmlFor="pwa-icon" className="block font-mono text-xs uppercase text-(--body)">
                    App Icon / Logo URL <span className="text-(--coral)">*</span>
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.iconUrl}
                        alt="App Icon Preview"
                        className="w-14 h-14 rounded-xl border border-(--line) object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-(--ink) text-(--paper) font-display text-xl font-bold flex items-center justify-center shrink-0">
                        {formData.title ? formData.title.charAt(0).toUpperCase() : "P"}
                      </div>
                    )}
                    <input
                      id="pwa-icon"
                      type="url"
                      value={formData.iconUrl}
                      onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                      placeholder="https://your-domain.com/icon-512.png"
                      className="flex-1 h-11 px-3.5 rounded-md border border-(--line) bg-(--card) text-sm outline-none focus:border-(--ink)"
                    />
                  </div>
                  {fieldErrors.iconUrl && (
                    <p className="text-xs text-red-600">{fieldErrors.iconUrl}</p>
                  )}
                </div>

                {/* Screenshots List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-xs uppercase text-(--body)">
                      Screenshots ({formData.screenshots.length}/5) <span className="text-(--coral)">*</span>
                    </label>
                    <span className="text-xs font-mono text-(--body-dim)">
                      At least 1 required
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.screenshotInput}
                      onChange={(e) => setFormData({ ...formData, screenshotInput: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddScreenshot();
                        }
                      }}
                      placeholder="https://your-domain.com/screenshot1.png"
                      className="flex-1 h-11 px-3.5 rounded-md border border-(--line) bg-(--card) text-sm outline-none focus:border-(--ink)"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddScreenshot}
                      disabled={formData.screenshots.length >= 5 || !formData.screenshotInput.trim()}
                      className="h-11 px-4 border-(--line) text-(--ink) flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </Button>
                  </div>

                  {fieldErrors.screenshots && (
                    <p className="text-xs text-red-600">{fieldErrors.screenshots}</p>
                  )}

                  {formData.screenshots.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      {formData.screenshots.map((url, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-(--line)">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Screenshot ${idx + 1}`}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveScreenshot(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 text-white hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4 Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-(--line)">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="h-11 px-5 border-(--line) text-(--body) hover:text-(--ink)"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleValidateStep4}
                  className="h-11 px-6 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm flex items-center gap-2"
                >
                  <span>Next: Preview</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STEP 5: PREVIEW & SUBMIT */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight mb-2">
                  Preview & Submit
                </h2>
                <p className="text-sm text-(--body) leading-relaxed">
                  Review your listing mockup. Once submitted, your app enters the review queue.
                </p>
              </div>

              <PwaPreviewCard data={formData} />

              {submitError && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{submitError}</div>
                </div>
              )}

              {/* Final Submit Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-(--line)">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setCurrentStep(4)}
                  className="h-11 px-5 border-(--line) text-(--body) hover:text-(--ink)"
                >
                  Back
                </Button>

                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitForReview}
                  className="h-12 px-8 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-base rounded-md shadow-none flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending for review...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Submit for Review</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
