import type { MetadataRoute } from "next";
import { getApprovedPwas } from "@/lib/services/pwa.service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://likha-apps.vercel.app");

  let pwaEntries: MetadataRoute.Sitemap = [];

  try {
    const approvedPwas = await getApprovedPwas(100);
    pwaEntries = approvedPwas
      .filter((pwa) => Boolean(pwa.slug || pwa.id))
      .map((pwa) => ({
        url: `${siteUrl}/apps/${pwa.slug || pwa.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch {
    // If database is not reachable during build, sitemap gracefully defaults to base routes
    pwaEntries = [];
  }

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    ...pwaEntries,
  ];
}

