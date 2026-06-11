import type { MetadataRoute } from "next";

// @spec PWA-MANIFEST-001, PWA-MANIFEST-002
// Next.js serves this at /manifest.webmanifest. Colors mirror the warm literary
// palette in globals.css (--color-bg / --color-ink) as static hex so the install
// prompt and standalone status bar match the app. Icons reuse the existing
// assets in public/icons/ plus the root SVG (no new art needed).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dogear",
    short_name: "Dogear",
    description: "Book club coordination without the group-chat sprawl.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F0E2",
    theme_color: "#F7F0E2",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icons/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icons/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
    ],
  };
}
