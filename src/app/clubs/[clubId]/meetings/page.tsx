import Link from "next/link";
import { getServerCaller } from "@/trpc/server";
import { prisma } from "@/lib/db";
import { Card, Badge } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { MeetingsClient } from "./meetings-client";

type ViewerRole = "owner" | "admin" | "member";

// @spec MEET-UI-CONFIRM-BTN-001 — viewerRole threading enables admin-only confirm UI.
export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  let meetings: any[] = [];
  let viewerId = "";
  let viewerRole: ViewerRole = "member";
  let error = "";

  try {
    const caller = await getServerCaller();
    const [meetingsResult, me] = await Promise.all([
      caller.meetings.list({ clubId }),
      caller.auth.me(),
    ]);
    meetings = meetingsResult;
    viewerId = me.user.id;

    const membership = await prisma.membership.findUnique({
      where: { clubId_userId: { clubId, userId: viewerId } },
      select: { role: true },
    });
    if (membership?.role === "owner" || membership?.role === "admin") {
      viewerRole = membership.role;
    }
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
      <MeetingsClient
        clubId={clubId}
        initialMeetings={meetings}
        viewerId={viewerId}
        viewerRole={viewerRole}
      />
    </div>
  );
}
