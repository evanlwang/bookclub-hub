import { getServerCaller } from "@/trpc/server";
import Link from "next/link";
import { LogoIcon } from "@/components/ui";
import { ClubSidebar } from "./sidebar";

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  let club: { name: string; code: string } | null = null;
  let userName = "";
  let clubs: { id: string; name: string; code: string; role: string }[] = [];
  let hasActiveVote = false;
  let hasUnrespondedMeeting = false;

  try {
    const caller = await getServerCaller();
    const [clubResult, me, rounds, meetings] = await Promise.all([
      caller.clubs.get({ clubId }),
      caller.auth.me(),
      caller.rounds.list({ clubId }),
      caller.meetings.list({ clubId }),
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
  } catch {
    // Will fall through to child which handles errors
  }

  return (
    <div className="min-h-screen flex">
      <ClubSidebar
        clubId={clubId}
        clubName={club?.name ?? "Club"}
        userName={userName}
        clubs={clubs}
        hasActiveVote={hasActiveVote}
        hasUnrespondedMeeting={hasUnrespondedMeeting}
      />
      <main className="flex-1 min-w-0 p-6 md:p-10">{children}</main>
    </div>
  );
}
