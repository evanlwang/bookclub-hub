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
    const result = await caller.clubs.get({ clubId });
    club = result.club;
    const me = await caller.auth.me();
    userName = me.user.displayName || me.user.email;
    clubs = me.clubs;

    const [rounds, meetings] = await Promise.all([
      caller.rounds.list({ clubId }),
      caller.meetings.list({ clubId }),
    ]);
    hasActiveVote = rounds.some(
      (r: any) => r.status === "nominating" || r.status === "voting"
    );
    // Light up Meetings if there's a proposed meeting the viewer hasn't touched.
    hasUnrespondedMeeting = meetings.some((m: any) => {
      if (m.status !== "proposed") return false;
      const respondedToAnySlot = (m.slots ?? []).some((s: any) =>
        (s.responses ?? []).some((r: any) => r.userId === me.user.id)
      );
      return !respondedToAnySlot;
    });
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
