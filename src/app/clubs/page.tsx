import { getServerCaller } from "@/trpc/server";
import Link from "next/link";
import { Card, Badge, LogoIcon } from "@/components/ui";
import { SignOutLink } from "./sign-out-link";

export default async function ClubsPage() {
  let clubs: { id: string; name: string; code: string; role: string }[] = [];
  let error = "";

  try {
    const caller = await getServerCaller();
    const result = await caller.auth.me();
    clubs = result.clubs;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Not authenticated";
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <LogoIcon size={36} />
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink mt-6 mb-2">
          My Clubs
        </h1>
        <p data-testid="auth-error" className="text-ink-3 text-sm mb-4">
          {error}
        </p>
        <Link
          href="/join"
          className="text-primary text-sm font-medium hover:underline"
        >
          Join a Club →
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink">
          My Clubs
        </h1>
        <SignOutLink />
      </div>
      <ul data-testid="club-list" className="space-y-3">
        {clubs.map((club) => (
          <li key={club.id} data-testid={`club-${club.id}`}>
            <Link href={`/clubs/${club.id}`}>
              <Card className="p-4 hover:border-line-strong transition-colors duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{club.name}</p>
                    <p className="text-xs text-ink-3 font-[var(--font-mono)]">
                      {club.code}
                    </p>
                  </div>
                  <Badge tone={club.role === "admin" ? "primary" : "neutral"}>
                    {club.role}
                  </Badge>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
