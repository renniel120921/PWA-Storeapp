import type { Metadata } from "next";
import { AboutPageClient } from "@/components/about/AboutPageClient";

export const metadata: Metadata = {
  title: "About Likha Apps — Web App & PWA Marketplace",
  description:
    "Learn what Likha Apps is, how the marketplace works, and how developers and users can discover and share web apps and PWAs.",
  openGraph: {
    title: "About Likha Apps — Web App & PWA Marketplace",
    description:
      "Learn what Likha Apps is, how the marketplace works, and how developers and users can discover and share web apps and PWAs.",
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}

