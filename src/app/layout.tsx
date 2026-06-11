import type { Metadata, Viewport } from "next";
import { TRPCProvider } from "@/trpc/react";
import "./globals.css";

// @spec PWA-VIEWPORT-001 — viewport-fit:cover lets the layout extend under the
// notch/home indicator so env(safe-area-inset-*) resolves nonzero; themeColor
// tints the mobile status/URL bar to match the app background.
export const viewport: Viewport = {
  themeColor: "#faf8f3",
  viewportFit: "cover",
};

// Next.js App Router auto-discovers `app/icon.{svg,png}` and `app/apple-icon.png`
// and emits the canonical <link rel="icon"> / <link rel="apple-touch-icon">.
// The explicit `icons` entries below add the larger PNGs from /public/icons
// for Android home-screen, PWA manifests, and high-DPI displays.
// When the pilot passcode gate is on, the URL is shared by trust and shouldn't
// show up in search results. Removing PILOT_PASSCODE (post-pilot) drops the
// noindex automatically.
export const metadata: Metadata = {
  title: "Dogear",
  description: "Dogear — book club coordination without the group-chat sprawl.",
  robots: process.env.PILOT_PASSCODE ? { index: false, follow: false } : undefined,
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-bg focus:rounded-[var(--radius-md)] focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
