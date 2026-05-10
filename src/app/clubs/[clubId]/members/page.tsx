// @spec CLUB-UI-MEMBERS-001, CLUB-UI-MEMBERS-002
import { getServerCaller } from "@/trpc/server";
import { Card } from "@/components/ui";
import { MembersClient } from "./members-client";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  type Role = "owner" | "admin" | "member";
  let viewerRole: Role | null = null;
  let viewerId = "";
  let members: Awaited<ReturnType<Awaited<ReturnType<typeof getServerCaller>>["clubs"]["members"]["list"]>> = [];
  let clubName = "";
  let error = "";

  try {
    const caller = await getServerCaller();
    const me = await caller.auth.me();
    viewerId = me.user.id;
    const myMembership = me.clubs.find((c) => c.id === clubId);
    if (myMembership) {
      viewerRole = myMembership.role as Role;
    }

    if (!viewerRole) {
      error = "You are not a member of this club.";
    } else if (viewerRole === "member") {
      error = "Only admins and owners can view the members page.";
    } else {
      const club = await caller.clubs.get({ clubId });
      clubName = club.club.name;
      members = await caller.clubs.members.list({ clubId });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load members.";
  }

  if (error) {
    return (
      <Card className="p-6">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink mb-2">
          Members
        </h1>
        <p data-testid="members-error" className="text-danger text-sm">
          {error}
        </p>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-[1600px]">
      <header className="mb-6">
        <h1 className="font-[var(--font-display)] text-3xl font-semibold text-ink tracking-tight">
          Members
        </h1>
        <p className="text-ink-3 text-sm mt-1">
          {clubName} · {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </header>

      <MembersClient
        clubId={clubId}
        viewerId={viewerId}
        viewerRole={viewerRole === "owner" ? "owner" : "admin"}
        members={members.map((m) => ({
          userId: m.user.id,
          email: m.user.email,
          displayName: m.user.displayName,
          role: m.role as Role,
          joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : String(m.joinedAt),
        }))}
      />
    </div>
  );
}
