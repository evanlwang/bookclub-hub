import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { getServerCaller } from "@/trpc/server";
import { ClubSidebar } from "./sidebar";
import { MobileTabBar } from "./mobile-tab-bar";
import { MobileClubHeader } from "./mobile-club-header";

// Tab title resolves to the club's name so users with several open tabs can
// tell them apart. We swallow auth/not-found failures and fall back to the
// generic title rather than throwing — generateMetadata throwing would surface
// a 500 above the route's own error.tsx boundary.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubId: string }>;
}): Promise<Metadata> {
  const { clubId } = await params;
  try {
    const caller = await getServerCaller();
    const { club } = await caller.clubs.get({ clubId });
    return { title: `${club.name} · Dogear` };
  } catch {
    return { title: "Dogear" };
  }
}

// @spec CLUB-UI-THEME-APPLY-001
// Re-enter perceptual color space so hover/soft/ink track the picked hue
// rather than the original teal. Validated upstream by the API regex; we
// re-validate at the layout boundary so a bypassed write can't smuggle CSS
// into the inline <style>.
const HEX_RE = /^#[0-9a-f]{6}$/i;
function themeStyleFor(hex: string): string | null {
  if (!HEX_RE.test(hex)) return null;
  const c = hex.toLowerCase();
  return `--color-primary: ${c}; --color-primary-hover: color-mix(in oklch, ${c} 85%, black); --color-primary-soft: color-mix(in oklch, ${c} 18%, white); --color-primary-ink: color-mix(in oklch, ${c} 80%, black);`;
}

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  let club:
    | { name: string; code: string; themeColor: string | null }
    | null = null;
  let userName = "";
  let clubs: { id: string; name: string; code: string; role: string }[] = [];
  let initialNavState:
    | {
        hasActiveVote: boolean;
        hasUnrespondedMeeting: boolean;
        unreadDiscussionCounts: Record<string, number>;
      }
    | undefined;

  try {
    const caller = await getServerCaller();
    // @spec CLUB-API-NAVSTATE-001 — one consolidated badge read seeds the
    // client-side `useNavState` query (which then polls + gets invalidated
    // by mutations), replacing the old rounds/meetings/unread trio.
    const [clubResult, me, navState] = await Promise.all([
      caller.clubs.get({ clubId }),
      caller.auth.me(),
      caller.clubs.navState({ clubId }),
    ]);
    club = clubResult.club;
    userName = me.user.displayName || me.user.email;
    clubs = me.clubs;
    initialNavState = navState;
  } catch (e) {
    // @spec CLUB-UI-ACCESS-GUARD-001, CLUB-UI-ACCESS-GUARD-002 — the layout is
    // the common ancestor of every club route, so it owns the access decision
    // once for the whole subtree. memberProcedure surfaces two "not allowed to
    // view this club" failures we bounce on (a nonexistent club id misses the
    // membership lookup and also reports FORBIDDEN). redirect() throws
    // NEXT_REDIRECT, which propagates out of this catch; any other (unexpected)
    // error falls through to the child / route error.tsx boundary.
    if (e instanceof TRPCError) {
      if (e.code === "UNAUTHORIZED") redirect("/login");
      if (e.code === "FORBIDDEN" || e.code === "NOT_FOUND") redirect("/");
    }
    // Will fall through to child which handles errors
  }

  const themeColor = club?.themeColor ?? null;
  const themeCss = themeColor ? themeStyleFor(themeColor) : null;

  return (
    <div
      className="min-h-screen flex"
      data-club-id={clubId}
      data-club-theme={themeColor ?? "default"}
    >
      {themeCss && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-club-id="${clubId}"]{${themeCss}}`,
          }}
        />
      )}
      <ClubSidebar
        clubId={clubId}
        clubName={club?.name ?? "Club"}
        userName={userName}
        clubs={clubs}
        initialNavState={initialNavState}
      />
      <main className="flex-1 min-w-0">
        {/* Mobile-only sticky club header (switcher + brand). Hidden on md+. */}
        <MobileClubHeader
          clubId={clubId}
          clubName={club?.name ?? "Club"}
          userName={userName}
          clubs={clubs}
          initialNavState={initialNavState}
        />
        {/* @spec NAV-MOBILE-005 — pad the content bottom on phones so nothing
            hides behind the fixed tab bar (~64px bar + home-indicator inset). */}
        <div className="p-[clamp(1rem,2.5vw,3.5rem)] pt-4 md:pt-[clamp(1rem,2.5vw,3.5rem)] pb-[calc(64px+env(safe-area-inset-bottom)+1rem)] md:pb-[clamp(1rem,2.5vw,3.5rem)]">
          {children}
        </div>
      </main>
      <MobileTabBar clubId={clubId} initialNavState={initialNavState} />
    </div>
  );
}
