// @spec INFRA-ENV-VALIDATION-001
//
// Boot-time environment validation + typed live accessors.
//
// `parseEnv` runs once at import (side effect via `validateBootEnv()` below).
// In production, a missing required key throws immediately with a readable
// message instead of failing later in the request path.
//
// The exported `env` object exposes the same keys via getters that read
// `process.env` *live* — this preserves the test pattern of mutating
// `process.env.PILOT_PASSCODE` / `vi.stubEnv("NODE_ENV", ...)` mid-suite
// without re-importing the module. Type-safe at the access site even though
// the underlying read is dynamic.
//
// Convention:
//   - Required in production: DATABASE_URL, DIRECT_URL, CRON_SECRET.
//   - Optional with documented fallback behavior in the consumer:
//       RESEND_API_KEY (unset / "re_mock*" / "test" → email.ts skips sending),
//       PILOT_PASSCODE (unset in production → passcode.ts fails closed).

import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1).optional(),
    DIRECT_URL: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(1).optional(),
    PILOT_PASSCODE: z.string().optional(),
    OPEN_LIBRARY_BASE_URL: z
      .string()
      .url()
      .default("https://openlibrary.org"),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV !== "production") return;
    const required = ["DATABASE_URL", "DIRECT_URL", "CRON_SECRET"] as const;
    for (const key of required) {
      if (!val[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Missing required env in production: ${key}`,
        });
      }
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}

// Side effect at module load: validate the current env. Throws on missing
// production-required keys so a misconfigured deploy fails fast instead of
// at first request.
//
// Skip during the Next.js production *build* phase: `next build` executes
// route modules to collect page data with NODE_ENV=production, but runtime
// secrets (DIRECT_URL, CRON_SECRET) are not — and need not be — present at
// build time. Validating there is a false positive that breaks the build;
// the real fail-fast still happens at runtime on the first request.
if (process.env.NEXT_PHASE !== "phase-production-build") {
  parseEnv();
}

// Live getters so test code that mutates process.env (or uses vi.stubEnv)
// is observed by callers. The schema's defaults are inlined per-getter.
export const env = {
  get NODE_ENV(): Env["NODE_ENV"] {
    const v = process.env.NODE_ENV;
    return v === "test" || v === "production" ? v : "development";
  },
  get DATABASE_URL(): string | undefined {
    return process.env.DATABASE_URL || undefined;
  },
  get DIRECT_URL(): string | undefined {
    return process.env.DIRECT_URL || undefined;
  },
  get RESEND_API_KEY(): string | undefined {
    return process.env.RESEND_API_KEY || undefined;
  },
  get CRON_SECRET(): string | undefined {
    return process.env.CRON_SECRET || undefined;
  },
  get PILOT_PASSCODE(): string | undefined {
    return process.env.PILOT_PASSCODE;
  },
  get OPEN_LIBRARY_BASE_URL(): string {
    return process.env.OPEN_LIBRARY_BASE_URL || "https://openlibrary.org";
  },
} as const;
