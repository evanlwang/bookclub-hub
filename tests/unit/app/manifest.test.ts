// @spec PWA-MANIFEST-001, PWA-MANIFEST-002
import { describe, it, expect } from "vitest";
import manifest from "@/app/manifest";

describe("web app manifest", () => {
  const m = manifest();

  it("declares a standalone installable app named Dogear", () => {
    expect(m.name).toBe("Dogear");
    expect(m.short_name).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.theme_color).toBeTruthy();
    expect(m.background_color).toBeTruthy();
  });

  it("references the existing 192px and 512px home-screen icons", () => {
    const srcs = (m.icons ?? []).map((i) => i.src);
    expect(srcs).toContain("/icons/icon-192.png");
    expect(srcs).toContain("/icons/icon-512.png");
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  // @spec PWA-MANIFEST-002 — a maskable icon for safe-zone-padded home screens
  it("declares a maskable 512px icon entry", () => {
    const maskable = (m.icons ?? []).filter((i) =>
      (i.purpose ?? "").split(/\s+/).includes("maskable"),
    );
    expect(maskable.length).toBeGreaterThanOrEqual(1);
    expect(maskable.some((i) => i.sizes === "512x512")).toBe(true);
  });
});
