import { timingSafeEqual } from "crypto";

// Pilot gate — reject if PILOT_PASSCODE is set in env and the input doesn't
// match. When the env var is unset (local dev / `make up`), accept anything
// so the seeded test accounts keep working without extra ceremony.
//
// Used by every entry point that creates a User or Session for an
// unauthenticated caller: auth.signIn, auth.enter, and the unauth branch of
// clubs.join. If you add another such entry point, gate it here too.
export function passcodeOk(input: string): boolean {
  const expected = process.env.PILOT_PASSCODE;
  if (!expected) return true;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
