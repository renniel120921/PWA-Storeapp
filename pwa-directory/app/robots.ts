import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://likha-apps.vercel.app");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/apps/"],
        disallow: [
          "/admin",
          "/admin/",
          "/admin-bootstrap",
          "/dashboard",
          "/dashboard/",
          "/submit",
          "/api",
          "/api/",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

