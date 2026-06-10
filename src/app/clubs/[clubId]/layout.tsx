import type { Metadata } from "next";
import { getServerCaller } from "@/trpc/server";
import { ClubSidebar } from "./sidebar";
import { MobileTabBar } from "./mobile-tab-bar";

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
  let hasActiveVote = false;
  let hasUnrespondedMeeting = false;
  let unreadDiscussionCounts: Record<string, number> = {};

  try {
    const caller = await getServerCaller();
    const [clubResult, me, rounds, meetings, unreadCounts] = await Promise.all([
      caller.clubs.get({ clubId }),
      caller.auth.me(),
      caller.rounds.list({ clubId }),
      caller.meetings.list({ clubId }),
      caller.clubs.unreadDiscussionCounts(),
    ]);
    club = clubResult.club;
    userName = me.user.displayName || me.user.email;
    clubs = me.clubs;
    hasActiveVote = rounds.some(
      (r: any) => r.status === "nominating" || r.status === "voting"
    );
    hasUnrespondedMeeting = meetings.some(
      (m: any) => m.status === "proposed" && !m.viewerHasResponded
    );
    unreadDiscussionCounts = unreadCounts;
  } catch {
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
        hasActiveVote={hasActiveVote}
        hasUnrespondedMeeting={hasUnrespondedMeeting}
        unreadDiscussionCounts={unreadDiscussionCounts}
      />
      {/* @spec NAV-MOBILE-005 — pad the content bottom on phones so nothing
          hides behind the fixed tab bar (56px bar + home-indicator inset). */}
      <main className="flex-1 min-w-0 p-[clamp(1rem,2.5vw,3.5rem)] pb-[calc(56px+env(safe-area-inset-bottom)+1rem)] md:pb-[clamp(1rem,2.5vw,3.5rem)]">
        {children}
      </main>
      <MobileTabBar
        clubId={clubId}
        userName={userName}
        clubs={clubs}
        hasActiveVote={hasActiveVote}
        hasUnrespondedMeeting={hasUnrespondedMeeting}
        unreadDiscussionCounts={unreadDiscussionCounts}
      />
    </div>
  );
}
