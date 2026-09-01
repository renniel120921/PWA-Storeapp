import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Likha Apps — Curated Progressive Web Apps",
    short_name: "Likha Apps",
    description:
      "A curated directory and open marketplace of progressive web apps built by independent developers.",
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#F6F4EC",
    theme_color: "#122A2C",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    categories: ["utilities", "productivity", "developer tools", "lifestyle"],
  };
}

