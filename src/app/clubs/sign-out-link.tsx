// @spec AUTH-UI-LOGOUT-002
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutLink() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/trpc/auth.logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      // Server emits the clearing Set-Cookie; we still wipe locally as a backup.
    }
    document.cookie = "session_id=; Path=/; Max-Age=0; SameSite=Lax";
    router.push("/");
  }

  return (
    <button
      type="button"
      data-testid="clubs-signout"
      onClick={handleSignOut}
      disabled={signingOut}
      className="text-sm text-ink-3 hover:text-ink transition-colors disabled:opacity-50"
    >
      {signingOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
