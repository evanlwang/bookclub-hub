import { getServerCaller } from "@/trpc/server";
import { Card, Badge } from "@/components/ui";
import { MeetingsClient } from "./meetings-client";

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  let meetings: any[] = [];
  let error = "";

  try {
    const caller = await getServerCaller();
    meetings = await caller.meetings.list({ clubId });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Error loading meetings";
  }

  if (error) {
    return <p data-testid="meetings-error" className="text-danger">{error}</p>;
  }

  return <MeetingsClient clubId={clubId} initialMeetings={meetings} />;
}
