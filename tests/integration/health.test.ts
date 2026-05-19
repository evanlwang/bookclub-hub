import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("/api/health", () => {
  it("returns 200 with status ok when DB is reachable", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    // commit is either the Vercel-injected SHA or the "unknown" fallback,
    // both are acceptable — just ensure the field is present.
    expect(typeof body.commit).toBe("string");
  });

  it("does not leak env values or PII in the response", async () => {
    const res = await GET();
    const body = await res.json();
    // Allowlist of permitted keys — anything else would be a leak.
    expect(Object.keys(body).sort()).toEqual(["commit", "db", "status"]);
  });
});
