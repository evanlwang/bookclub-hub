// @spec CLUB-UI-SETTINGS-001
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerCaller } from "@/trpc/server";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { SettingsForm } from "./settings-form";

export default async function ClubSettingsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  let club: {
    id: string;
    name: string;
    description: string | null;
    code: string;
    votingCadence: "monthly" | "six_weeks" | "flexible";
    themeColor: string | null;
  } | null = null;
  let viewerRole: "owner" | "admin" | "member" | null = null;
  let error = "";

  try {
    const caller = await getServerCaller();
    const me = await caller.auth.me();
    const myMembership = me.clubs.find((c) => c.id === clubId);
    if (!myMembership) {
      redirect(`/clubs/${clubId}`);
    }
    viewerRole = myMembership.role as "owner" | "admin" | "member";

    if (viewerRole !== "owner" && viewerRole !== "admin") {
      // Settings is admin-only — non-admins get bounced back to the dashboard.
      redirect(`/clubs/${clubId}`);
    }

    const row = await prisma.club.findUniqueOrThrow({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        votingCadence: true,
        themeColor: true,
      },
    });
    club = row;
  } catch (e: unknown) {
    if (e && typeof e === "object" && "digest" in e) throw e; // re-throw redirect
    error = e instanceof Error ? e.message : "Error loading settings";
  }

  if (error || !club) {
    return (
      <p data-testid="settings-error" className="text-danger">
        {error || "Club not found"}
      </p>
    );
  }

  return (
    <div className="w-full max-w-[1200px]">
      <Link
        href={`/clubs/${clubId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Dashboard
      </Link>

      <h1
        data-testid="settings-heading"
        className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight mb-6"
      >
        Club settings
      </h1>

      <Card className="p-6 mb-6">
        <SettingsForm
          clubId={clubId}
          initialName={club.name}
          initialDescription={club.description ?? ""}
          initialCadence={club.votingCadence}
          initialThemeColor={club.themeColor}
          isOwner={viewerRole === "owner"}
        />
      </Card>
    </div>
  );
}
