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

  try {
    const caller = await getServerCaller();
    const result = await caller.clubs.get({ clubId });
    club = result.club;
    const me = await caller.auth.me();
    userName = me.user.displayName || me.user.email;
  } catch {
    // Will fall through to child which handles errors
  }

  return (
    <div className="min-h-screen flex">
      <ClubSidebar clubId={clubId} clubName={club?.name ?? "Club"} userName={userName} />
      <main className="flex-1 min-w-0 p-6 md:p-10">{children}</main>
    </div>
  );
}
