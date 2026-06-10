import type { Metadata, Viewport } from "next";
import { Nunito, Newsreader, Courier_Prime } from "next/font/google";
import { TRPCProvider } from "@/trpc/react";
import "./globals.css";

// Cozy-redesign type system, loaded via next/font to avoid the FOUT/layout pop
// on the chunky headlines. Each exposes a CSS variable consumed by the @theme
// font tokens in globals.css. Nunito = display + UI (retires Geist),
// Newsreader = prose (--font-serif), Courier Prime = mono/stamps.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});
const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier-prime",
  display: "swap",
});

// @spec PWA-VIEWPORT-001 — viewport-fit:cover lets the layout extend under the
// notch/home indicator so env(safe-area-inset-*) resolves nonzero; themeColor
// tints the mobile status/URL bar to match the paper background.
export const viewport: Viewport = {
  themeColor: "#F7F0E2",
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
    <html
      lang="en"
      className={`${nunito.variable} ${newsreader.variable} ${courierPrime.variable}`}
    >
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
