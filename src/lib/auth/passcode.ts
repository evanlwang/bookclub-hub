import { timingSafeEqual } from "crypto";

// Pilot gate — reject if PILOT_PASSCODE is set in env and the input doesn't
// match. When the env var is unset, behavior depends on NODE_ENV: dev/test
// accepts anything (so `make up` and the seeded test accounts work without
// ceremony); production fails closed (so a forgotten env var locks the URL
// instead of silently opening it).
//
// Used by every entry point that creates a User or Session for an
// unauthenticated caller: auth.signIn, auth.enter, and the unauth branch of
// clubs.join. If you add another such entry point, gate it here too.
// @spec AUTH-API-PASSCODE-001
export function passcodeOk(input: string): boolean {
  const expected = process.env.PILOT_PASSCODE;
  if (!expected) {
    // @spec AUTH-API-PASSCODE-002
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
