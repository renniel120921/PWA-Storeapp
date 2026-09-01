import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Tag,
  Calendar,
  Smartphone,
  Laptop,
  Apple,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PwaCard } from "@/components/directory/PwaCard";
import { getPwaBySlug, getPwasByCategory } from "@/lib/services/pwa.service";

export const dynamic = "force-dynamic";

interface AppDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: AppDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const pwa = await getPwaBySlug(slug);

  if (!pwa || pwa.status !== "approved") {
    return {
      title: "App Not Found — Likha Apps",
      description: "The requested progressive web app could not be found in the directory.",
    };
  }

  const metaDesc =
    pwa.tagline || pwa.description.slice(0, 160) || "Progressive Web App on Likha Apps";

  return {
    title: `${pwa.title} — Likha Apps`,
    description: metaDesc,
    openGraph: {
      title: `${pwa.title} — Likha Apps`,
      description: metaDesc,
      type: "website",
      images: pwa.iconUrl ? [{ url: pwa.iconUrl }] : undefined,
    },
  };
}

export default async function AppDetailPage({ params }: AppDetailProps) {
  const { slug } = await params;
  const pwa = await getPwaBySlug(slug);

  if (!pwa || pwa.status !== "approved") {
    notFound();
  }

  const targetUrl = pwa.appUrl || pwa.app_url || "";
  const displayCategory =
    pwa.primaryCategory || (pwa.categories && pwa.categories[0]) || "tools";

  // Fetch related apps in same category
  const allCategoryApps = await getPwasByCategory(pwa.primaryCategory, 4);
  const relatedApps = allCategoryApps
    .filter((item) => item.id !== pwa.id && item.slug !== pwa.slug)
    .slice(0, 3);

  // Formatted date if timestamp exists
  const rawDate = pwa.approvedAt || pwa.submittedAt;
  const formattedDate = rawDate
    ? new Date(
        typeof rawDate === "object" && "seconds" in rawDate
          ? rawDate.seconds * 1000
          : (rawDate as string | number | Date)
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

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
      <div className="max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-(--body) hover:text-(--ink) transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to directory</span>
        </Link>

        {/* Hero Card */}
        <div className="bg-(--card) rounded-xl border border-(--line) p-8 sm:p-10 shadow-[5px_5px_0_0_var(--line)] mb-12">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Icon / Monogram */}
              {pwa.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pwa.iconUrl}
                  alt={`${pwa.title} icon`}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-(--line) object-cover shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-(--ink) text-(--paper) font-display text-3xl font-semibold flex items-center justify-center shrink-0 shadow-xs">
                  {pwa.title ? pwa.title.charAt(0).toUpperCase() : "P"}
                </div>
              )}

              {/* Title & Tagline */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs uppercase px-2.5 py-0.5 rounded border border-(--ink)/15 text-(--body) bg-(--paper)">
                    {displayCategory}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified PWA
                  </span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight mb-2">
                  {pwa.title}
                </h1>

                <p className="text-base sm:text-lg text-(--body) max-w-xl leading-relaxed">
                  {pwa.tagline || pwa.description}
                </p>

                {pwa.tags && pwa.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {pwa.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[11px] text-(--body-dim) bg-(--ink-soft) px-2 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full sm:w-auto md:w-full h-12 px-8 bg-(--coral) hover:bg-[#e85a3e] text-white text-base font-medium shadow-none transition-colors flex items-center justify-center gap-2">
                  <span>Open App</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
              <span className="text-[11px] font-mono text-(--body-dim) text-center">
                Runs instantly in browser
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout: Main Info (Left) & Metadata Sidebar (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-10">
            {/* About Section */}
            <section className="bg-(--card) rounded-xl border border-(--line) p-8 shadow-xs">
              <h2 className="font-display text-2xl font-medium text-(--ink) mb-4 tracking-tight">
                About this app
              </h2>
              <div className="text-(--body) text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
                {pwa.description || "No full description provided for this application."}
              </div>
            </section>

            {/* Screenshots Gallery (If available) */}
            {pwa.screenshots && pwa.screenshots.length > 0 && (
              <section className="bg-(--card) rounded-xl border border-(--line) p-8 shadow-xs">
                <h2 className="font-display text-2xl font-medium text-(--ink) mb-6 tracking-tight">
                  Screenshots
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pwa.screenshots.map((shot, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={idx}
                      src={shot}
                      alt={`${pwa.title} screenshot ${idx + 1}`}
                      className="rounded-lg border border-(--line) w-full h-auto object-cover"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* PWA Installation Guidance Section */}
            <section className="bg-(--card) rounded-xl border border-(--line) p-8 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-(--gold)" />
                <h2 className="font-display text-2xl font-medium text-(--ink) tracking-tight">
                  How to install this PWA
                </h2>
              </div>
              <p className="text-sm text-(--body) mb-6">
                Progressive Web Apps install directly from your web browser without going through traditional app stores.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Android Guidance */}
                <div className="p-4 rounded-lg bg-(--paper) border border-(--line)">
                  <div className="flex items-center gap-2 mb-2 font-display font-medium text-(--ink) text-sm">
                    <Smartphone className="w-4 h-4 text-(--coral)" />
                    <span>Android</span>
                  </div>
                  <p className="text-xs text-(--body) leading-relaxed">
                    Open the app URL in <strong>Chrome</strong> or <strong>Edge</strong>, tap the three dots <span className="font-mono">⋮</span>, and select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                  </p>
                </div>

                {/* iOS / iPadOS Guidance */}
                <div className="p-4 rounded-lg bg-(--paper) border border-(--line)">
                  <div className="flex items-center gap-2 mb-2 font-display font-medium text-(--ink) text-sm">
                    <Apple className="w-4 h-4 text-(--coral)" />
                    <span>iPhone & iPad</span>
                  </div>
                  <p className="text-xs text-(--body) leading-relaxed">
                    Open the app in <strong>Safari</strong>, tap the <strong>Share</strong> button <span className="font-mono">[⎙]</span>, scroll down, and select <strong>&quot;Add to Home Screen&quot;</strong>.
                  </p>
                </div>

                {/* Desktop Guidance */}
                <div className="p-4 rounded-lg bg-(--paper) border border-(--line)">
                  <div className="flex items-center gap-2 mb-2 font-display font-medium text-(--ink) text-sm">
                    <Laptop className="w-4 h-4 text-(--coral)" />
                    <span>Desktop</span>
                  </div>
                  <p className="text-xs text-(--body) leading-relaxed">
                    Open the app in <strong>Chrome</strong> or <strong>Edge</strong>, and click the <strong>Install icon</strong> in the right side of the address bar.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-5">
              <h3 className="font-mono text-xs uppercase tracking-wider text-(--body-dim) pb-2 border-b border-(--line)">
                Listing Information
              </h3>

              {/* Developer */}
              <div>
                <span className="text-xs font-mono text-(--body-dim) block mb-1">
                  Developer
                </span>
                <p className="text-sm font-medium text-(--ink)">
                  {pwa.developerName || "Independent Developer"}
                </p>
                {pwa.developerWebsite && (
                  <a
                    href={pwa.developerWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-(--coral) hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>Developer Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Category */}
              <div>
                <span className="text-xs font-mono text-(--body-dim) block mb-1">
                  Category
                </span>
                <div className="flex items-center gap-1.5 text-sm text-(--ink) capitalize">
                  <Tag className="w-3.5 h-3.5 text-(--body-dim)" />
                  <span>{displayCategory}</span>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <span className="text-xs font-mono text-(--body-dim) block mb-1">
                  Pricing
                </span>
                <span className="font-mono text-xs px-2.5 py-1 rounded bg-(--ink-soft) text-(--ink) capitalize font-medium">
                  {pwa.pricing || "Free"}
                </span>
              </div>

              {/* Host URL */}
              <div>
                <span className="text-xs font-mono text-(--body-dim) block mb-1">
                  Website URL
                </span>
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-(--ink) hover:text-(--coral) transition-colors flex items-center gap-1 truncate"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0 text-(--body-dim)" />
                  <span className="truncate">{targetUrl.replace(/^https?:\/\//, "")}</span>
                </a>
              </div>

              {/* Date */}
              {formattedDate && (
                <div>
                  <span className="text-xs font-mono text-(--body-dim) block mb-1">
                    Listed On
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-(--body)">
                    <Calendar className="w-3.5 h-3.5 text-(--body-dim)" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Apps Section */}
        {relatedApps.length > 0 && (
          <div className="mt-16 pt-12 border-t border-(--line)">
            <h2 className="font-display text-2xl font-medium text-(--ink) mb-8 tracking-tight">
              More in {displayCategory}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedApps.map((item) => (
                <PwaCard key={item.id || item.slug} app={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
