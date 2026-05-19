import { test, expect } from "@playwright/test";

test("security headers present on /", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["strict-transport-security"]).toContain("includeSubDomains");
  expect(headers["strict-transport-security"]).toContain("preload");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=()",
  );
});
