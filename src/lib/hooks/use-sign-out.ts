// @spec AUTH-UI-LOGOUT-001, AUTH-UI-LOGOUT-INVALIDATE-001
"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/react-hooks";

/**
 * Shared sign-out used by both the desktop sidebar and the mobile More sheet.
 * After the server clears the session cookie we wipe it locally as a backup and
 * drop every cached query — so any other open tab re-fetches against the now
 * unauthenticated session instead of rendering stale, signed-in data.
 */
export function useSignOut() {
  const router = useRouter();
  const logoutMutation = trpc.auth.logout.useMutation();
  const utils = trpc.useUtils();
  const signingOut = logoutMutation.isPending;

  async function signOut() {
    if (signingOut) return;
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Server emits the clearing Set-Cookie; we still wipe locally as a backup.
    }
    document.cookie = "session_id=; Path=/; Max-Age=0; SameSite=Lax";
    await utils.invalidate();
    router.push("/");
  }

  return { signOut, signingOut };
}
