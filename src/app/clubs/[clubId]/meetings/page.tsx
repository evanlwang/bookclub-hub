import Link from "next/link";
import { getServerCaller } from "@/trpc/server";
import { Card, Badge } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { MeetingsClient } from "./meetings-client";

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  let meetings: any[] = [];
  let viewerId = "";
  let error = "";

  try {
    const caller = await getServerCaller();
    const [meetingsResult, me] = await Promise.all([
      caller.meetings.list({ clubId }),
      caller.auth.me(),
    ]);
    meetings = meetingsResult;
    viewerId = me.user.id;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Error loading meetings";
  }

  if (error) {
    return <p data-testid="meetings-error" className="text-danger">{error}</p>;
  }

  return (
    <div>
      <Link
        href={`/clubs/${clubId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Dashboard
      </Link>
      <MeetingsClient clubId={clubId} initialMeetings={meetings} viewerId={viewerId} />
    </div>
  );
}
